import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  BadgeCheck,
  Building2,
  Copy,
  KeyRound,
  MailPlus,
  RefreshCcw,
  ScrollText,
  Users,
  Waypoints,
} from "lucide-react";

import Card from "../components/ui/Card";
import { AuthContext } from "../context/auth-context";
import { getAuthToken } from "../utils/auth";
import { apiUrl, getApiBase } from "../utils/api";

const scopeOptions = [
  { value: "ingest:telemetry", label: "Telemetry ingest" },
  { value: "alerts:write", label: "Alert writeback" },
  { value: "analytics:read", label: "Analytics read" },
];
const roleOptions = ["ADMIN", "OPERATOR", "ANALYST", "VIEWER"];
const memberStatusOptions = ["ACTIVE", "SUSPENDED"];
const planOptions = ["STARTER", "GROWTH", "ENTERPRISE"];
const canReadAuditFeed = (role = "") => ["OWNER", "ADMIN", "OPERATOR", "ANALYST"].includes(role);
const canManageWorkspaceRole = (role = "") => ["OWNER", "ADMIN"].includes(role);

const Workspace = () => {
  const { user, updateUser } = useContext(AuthContext);
  const token = getAuthToken();
  const apiBase = useMemo(() => getApiBase() || window.location.origin, []);

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [generatedSecret, setGeneratedSecret] = useState("");
  const [generatedInviteLink, setGeneratedInviteLink] = useState("");
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState("");
  const [workspaceForm, setWorkspaceForm] = useState({
    organizationName: "",
    teamName: "",
    industry: "",
    timezone: "",
    building: "",
    apiAccessEnabled: true,
    mfaEnabled: false,
    dataRetentionDays: 365,
  });
  const [keyForm, setKeyForm] = useState({ label: "Primary gateway key", expiresInDays: 90, scopes: ["ingest:telemetry"] });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "ANALYST", message: "", expiresInDays: 7 });
  const [planSelection, setPlanSelection] = useState("STARTER");
  const [memberDrafts, setMemberDrafts] = useState({});

  const activeRole = overview?.workspace?.role || user?.role || "";
  const canManageWorkspace = canManageWorkspaceRole(activeRole);
  const canViewAuditFeed = canReadAuditFeed(activeRole);
  const sampleCurl = useMemo(() => {
    if (!generatedSecret) return "";
    return `curl -X POST "${apiBase}/api/iot/webhook/ingest" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${generatedSecret}" \\
  -d '{"sensorId":"campus-gateway-01","building":"Hostel A","water":420,"energy":188}'`;
  }, [apiBase, generatedSecret]);

  const buildInviteLink = useCallback((tokenValue) => {
    if (!tokenValue) return "";
    return `${apiBase.replace(/\/$/, "")}/register?inviteToken=${tokenValue}`;
  }, [apiBase]);

  const loadWorkspace = useCallback(async () => {
    if (!token) return setLoading(false);
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const [overviewRes, profileRes] = await Promise.all([
        fetch(apiUrl("/api/platform/overview"), { headers }),
        fetch(apiUrl("/api/user/profile"), { headers }),
      ]);
      const overviewJson = await overviewRes.json();
      const profileJson = await profileRes.json();
      if (!overviewRes.ok) throw new Error(overviewJson.msg || "Workspace overview failed");
      if (!profileRes.ok) throw new Error(profileJson.msg || "Profile load failed");

      const resolvedRole = overviewJson.workspace?.role || profileJson.user?.role || "";
      let keysJson = { apiKeys: [] };
      let auditJson = { logs: [] };

      if (canManageWorkspaceRole(resolvedRole) || canReadAuditFeed(resolvedRole)) {
        const optionalRequests = [];
        if (canManageWorkspaceRole(resolvedRole)) {
          optionalRequests.push(fetch(apiUrl("/api/platform/api-keys"), { headers }));
        }
        if (canReadAuditFeed(resolvedRole)) {
          optionalRequests.push(fetch(apiUrl("/api/platform/audit?limit=8"), { headers }));
        }

        const optionalResponses = await Promise.all(optionalRequests);
        let responseIndex = 0;

        if (canManageWorkspaceRole(resolvedRole)) {
          const keysRes = optionalResponses[responseIndex++];
          const parsedKeys = await keysRes.json();
          if (!keysRes.ok) throw new Error(parsedKeys.msg || "API key load failed");
          keysJson = parsedKeys;
        }

        if (canReadAuditFeed(resolvedRole)) {
          const auditRes = optionalResponses[responseIndex++];
          const parsedAudit = await auditRes.json();
          if (!auditRes.ok) throw new Error(parsedAudit.msg || "Audit load failed");
          auditJson = parsedAudit;
        }
      }

      setOverview(overviewJson);
      setApiKeys(Array.isArray(keysJson.apiKeys) ? keysJson.apiKeys : []);
      setAuditLogs(Array.isArray(auditJson.logs) ? auditJson.logs : []);
      setPlanSelection(overviewJson.workspace?.plan || "STARTER");
      setWorkspaceForm({
        organizationName: profileJson.user?.organizationName || "",
        teamName: profileJson.user?.teamName || "Operations",
        industry: profileJson.user?.industry || "Smart Buildings",
        timezone: profileJson.user?.timezone || "Asia/Kolkata",
        building: profileJson.user?.building || "",
        apiAccessEnabled: Boolean(profileJson.user?.apiAccessEnabled),
        mfaEnabled: Boolean(profileJson.user?.mfaEnabled),
        dataRetentionDays: Number(profileJson.user?.dataRetentionDays || 365),
      });
      updateUser(profileJson.user);
    } catch (err) {
      toast.error(err.message || "Workspace load failed");
    } finally {
      setLoading(false);
    }
  }, [token, updateUser]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);
  useEffect(() => {
    const drafts = {};
    (overview?.team?.members || []).forEach((member) => { drafts[member._id] = { role: member.role, status: member.status }; });
    setMemberDrafts(drafts);
  }, [overview?.team?.members]);

  const copyText = async (text, message) => {
    try { await navigator.clipboard.writeText(text); toast.success(message); } catch { toast.error("Copy failed"); }
  };
  const onWorkspaceChange = (event) => {
    const { name, value, type, checked } = event.target;
    setWorkspaceForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };
  const toggleScope = (scope) => setKeyForm((prev) => {
    const scopes = prev.scopes.includes(scope) ? prev.scopes.filter((item) => item !== scope) : [...prev.scopes, scope];
    return { ...prev, scopes: scopes.length ? scopes : ["ingest:telemetry"] };
  });

  const saveWorkspace = async (event) => {
    event.preventDefault();
    try {
      setSavingWorkspace(true);
      const res = await fetch(apiUrl("/api/user/update"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...workspaceForm, dataRetentionDays: Number(workspaceForm.dataRetentionDays) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.msg || "Workspace update failed");
      updateUser(json.user);
      toast.success("Workspace updated");
      await loadWorkspace();
    } catch (err) {
      toast.error(err.message || "Workspace update failed");
    } finally {
      setSavingWorkspace(false);
    }
  };

  const createKey = async (event) => {
    event.preventDefault();
    try {
      setCreatingKey(true);
      setGeneratedSecret("");
      const res = await fetch(apiUrl("/api/platform/api-keys"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: keyForm.label, expiresInDays: Number(keyForm.expiresInDays), scopes: keyForm.scopes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.msg || "API key creation failed");
      setGeneratedSecret(json.secret || "");
      toast.success("API key created");
      await loadWorkspace();
    } catch (err) {
      toast.error(err.message || "API key creation failed");
    } finally {
      setCreatingKey(false);
    }
  };

  const createInvite = async (event) => {
    event.preventDefault();
    try {
      setCreatingInvite(true);
      const res = await fetch(apiUrl("/api/platform/team/invites"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...inviteForm, expiresInDays: Number(inviteForm.expiresInDays) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.msg || "Invite creation failed");
      setGeneratedInviteLink(buildInviteLink(json.invite?.token));
      setInviteForm({ email: "", role: "ANALYST", message: "", expiresInDays: 7 });
      toast.success("Invite created");
      await loadWorkspace();
    } catch (err) {
      toast.error(err.message || "Invite creation failed");
    } finally {
      setCreatingInvite(false);
    }
  };

  const revokeInvite = async (id) => {
    const res = await fetch(apiUrl(`/api/platform/team/invites/${id}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (!res.ok || !json.success) return toast.error(json.msg || "Invite revoke failed");
    toast.success("Invite revoked");
    await loadWorkspace();
  };

  const updatePlan = async () => {
    try {
      setUpdatingPlan(true);
      const res = await fetch(apiUrl("/api/platform/plan"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: planSelection }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.msg || "Plan update failed");
      toast.success(`Plan set to ${json.plan}`);
      await loadWorkspace();
    } catch (err) {
      toast.error(err.message || "Plan update failed");
    } finally {
      setUpdatingPlan(false);
    }
  };

  const saveMember = async (memberId) => {
    try {
      setSavingMemberId(memberId);
      const res = await fetch(apiUrl(`/api/platform/team/members/${memberId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(memberDrafts[memberId]),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.msg || "Member update failed");
      toast.success("Member updated");
      await loadWorkspace();
    } catch (err) {
      toast.error(err.message || "Member update failed");
    } finally {
      setSavingMemberId("");
    }
  };

  const revokeKey = async (id) => {
    const res = await fetch(apiUrl(`/api/platform/api-keys/${id}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (!res.ok || !json.success) return toast.error(json.msg || "API key revoke failed");
    toast.success("API key revoked");
    await loadWorkspace();
  };

  if (loading) return <div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading workspace console...</div>;

  return (
    <div className="space-y-8">
      <Toaster />
      <Card className="border border-gray-200/80 bg-gradient-to-br from-white via-cyan-50/60 to-emerald-50/60 dark:border-gray-800/80 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Deep SaaS workspace control center</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Manage team onboarding, plan limits, auditability, and integration access from one workspace.</p>
          </div>
          <button onClick={loadWorkspace} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black"><RefreshCcw size={16} />Refresh</button>
        </div>
      </Card>

      {overview ? <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Readiness", value: `${overview.readiness?.score || 0}%`, meta: overview.readiness?.label, icon: BadgeCheck },
            { label: "Members", value: overview.team?.membersCount || 0, meta: `${overview.team?.pendingInvites || 0} pending invites`, icon: Users },
            { label: "Monthly telemetry", value: overview.operations?.monthlyTelemetry || 0, meta: `${overview.operations?.sensors?.total || 0} sensors`, icon: Waypoints },
            { label: "Active API keys", value: overview.operations?.apiKeys?.active || 0, meta: `${overview.operations?.alerts?.critical || 0} critical alerts`, icon: KeyRound },
          ].map((item) => {
            const Icon = item.icon;
            return <Card key={item.label} className="border border-gray-200/80 p-5 dark:border-gray-800/80"><div className="flex items-center justify-between"><p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p><Icon size={18} className="text-primary" /></div><p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{item.value}</p><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{item.meta}</p></Card>;
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border border-gray-200/80 p-6 dark:border-gray-800/80">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{overview.workspace?.organizationName}</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{overview.workspace?.organizationSlug} | {overview.workspace?.industry} | {overview.workspace?.teamName}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">{overview.workspace?.role}</span>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">{overview.workspace?.plan}</span>
            </div>
            <div className="mt-6 space-y-3">
              {(overview.readiness?.recommendations || []).length ? overview.readiness.recommendations.map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">{item}</div>
              )) : <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">Workspace is operating in a strong state.</div>}
            </div>
            <div className="mt-6 space-y-4">
              {(overview.planUsage?.metrics || []).map((metric) => (
                <div key={metric.key}>
                  <div className="flex items-center justify-between text-sm"><span className="text-gray-600 dark:text-gray-300">{metric.label}</span><span className="font-semibold text-gray-900 dark:text-white">{metric.used} / {metric.limit}</span></div>
                  <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800"><div className={`h-2 rounded-full ${metric.exceeded ? "bg-red-500" : metric.nearLimit ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(metric.utilizationPct || 0, 100)}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              {planOptions.map((plan) => (
                <button key={plan} type="button" onClick={() => canManageWorkspace && setPlanSelection(plan)} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${planSelection === plan ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"}`}>{plan}</button>
              ))}
            </div>
            {canManageWorkspace ? <button onClick={updatePlan} className="mt-4 w-full rounded-xl bg-slate-950 py-3 font-semibold text-white dark:bg-white dark:text-slate-950">{updatingPlan ? "Applying..." : `Apply ${planSelection}`}</button> : null}
            <div className="mt-6 space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Integration endpoints</p>
              {(overview.integrations || []).map((item) => <div key={item.path} className="text-sm text-gray-600 dark:text-gray-300">{item.method} {item.path} | {(item.auth || []).join(" or ")}</div>)}
            </div>
          </Card>

          <Card className="border border-gray-200/80 p-6 dark:border-gray-800/80">
            <div className="mb-4 flex items-center gap-2"><MailPlus size={18} className="text-primary" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team and invites</h3></div>
            {canManageWorkspace ? <form onSubmit={createInvite} className="space-y-3">
              <input type="email" value={inviteForm.email} onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="teammate@company.com" required />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <select value={inviteForm.role} onChange={(event) => setInviteForm((prev) => ({ ...prev, role: event.target.value }))} className="rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white">{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select>
                <input type="number" min="1" max="30" value={inviteForm.expiresInDays} onChange={(event) => setInviteForm((prev) => ({ ...prev, expiresInDays: event.target.value }))} className="rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="Expires in days" />
              </div>
              <textarea value={inviteForm.message} onChange={(event) => setInviteForm((prev) => ({ ...prev, message: event.target.value }))} className="min-h-24 w-full rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="Optional onboarding note" />
              <button className="w-full rounded-xl bg-primary py-3 font-semibold text-black">{creatingInvite ? "Creating invite..." : "Create invite"}</button>
            </form> : <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Only owners and admins can invite teammates.</div>}
            {generatedInviteLink ? <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Invite link</p><button onClick={() => copyText(generatedInviteLink, "Invite link copied")} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Copy size={12} />Copy</button></div><code className="mt-3 block overflow-x-auto rounded-xl bg-black/80 px-4 py-3 text-sm text-emerald-200">{generatedInviteLink}</code></div> : null}
            <div className="mt-6 space-y-3">
              {(overview.team?.invites || []).map((invite) => <div key={invite._id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><p className="font-semibold text-gray-900 dark:text-white">{invite.invitedEmail}</p><p className="text-xs text-gray-500 dark:text-gray-400">{invite.role} | Expires {new Date(invite.expiresAt).toLocaleDateString()}</p></div><div className="flex gap-2"><button type="button" onClick={() => copyText(buildInviteLink(invite.token), "Invite link copied")} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">Copy</button>{canManageWorkspace ? <button type="button" onClick={() => revokeInvite(invite._id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500">Revoke</button> : null}</div></div></div>)}
              {(overview.team?.members || []).map((member) => (
                <div key={member._id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div><p className="font-semibold text-gray-900 dark:text-white">{member.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p></div>
                    {canManageWorkspace && member.role !== "OWNER" ? <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><select value={memberDrafts[member._id]?.role || member.role} onChange={(event) => setMemberDrafts((prev) => ({ ...prev, [member._id]: { ...(prev[member._id] || {}), role: event.target.value, status: prev[member._id]?.status || member.status } }))} className="rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white">{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select><select value={memberDrafts[member._id]?.status || member.status} onChange={(event) => setMemberDrafts((prev) => ({ ...prev, [member._id]: { ...(prev[member._id] || {}), role: prev[member._id]?.role || member.role, status: event.target.value } }))} className="rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white">{memberStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select><button type="button" onClick={() => saveMember(member._id)} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">{savingMemberId === member._id ? "Saving..." : "Save"}</button></div> : <div className="flex gap-2"><span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">{member.role}</span><span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">{member.status}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border border-gray-200/80 p-6 dark:border-gray-800/80">
            <div className="mb-4 flex items-center gap-2"><Building2 size={18} className="text-primary" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workspace profile</h3></div>
            <form onSubmit={saveWorkspace} className="space-y-3">
              {["organizationName", "teamName", "industry", "timezone", "building"].map((field) => <input key={field} name={field} value={workspaceForm[field]} onChange={onWorkspaceChange} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder={field} />)}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300"><input name="apiAccessEnabled" type="checkbox" checked={workspaceForm.apiAccessEnabled} onChange={onWorkspaceChange} />Enable API access</label>
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300"><input name="mfaEnabled" type="checkbox" checked={workspaceForm.mfaEnabled} onChange={onWorkspaceChange} />Mark MFA enabled</label>
              </div>
              <input name="dataRetentionDays" type="number" min="30" max="3650" value={workspaceForm.dataRetentionDays} onChange={onWorkspaceChange} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="Data retention days" />
              <button className="w-full rounded-xl bg-primary py-3 font-semibold text-black">{savingWorkspace ? "Saving..." : "Save workspace"}</button>
            </form>
          </Card>

          <Card className="border border-gray-200/80 p-6 dark:border-gray-800/80">
            <div className="mb-4 flex items-center gap-2"><KeyRound size={18} className="text-primary" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create workspace API key</h3></div>
            {canManageWorkspace ? <>
              <form onSubmit={createKey} className="space-y-3">
                <input value={keyForm.label} onChange={(event) => setKeyForm((prev) => ({ ...prev, label: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="Key label" />
                <input type="number" min="1" max="365" value={keyForm.expiresInDays} onChange={(event) => setKeyForm((prev) => ({ ...prev, expiresInDays: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-black dark:border-gray-700 dark:bg-gray-900 dark:text-white" placeholder="Expires in days" />
                <div className="space-y-2">{scopeOptions.map((scope) => <label key={scope.value} className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300"><input type="checkbox" checked={keyForm.scopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} />{scope.label}</label>)}</div>
                <button className="w-full rounded-xl bg-slate-950 py-3 font-semibold text-white dark:bg-white dark:text-slate-950">{creatingKey ? "Creating..." : "Generate API key"}</button>
              </form>
              {generatedSecret ? <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">One-time secret</p><button onClick={() => copyText(generatedSecret, "API key copied")} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Copy size={12} />Copy</button></div><code className="mt-3 block overflow-x-auto rounded-xl bg-black/80 px-4 py-3 text-sm text-emerald-200">{generatedSecret}</code></div> : null}
            </> : <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Workspace API keys sirf owners aur admins manage kar sakte hain.</div>}
          </Card>
        </div>

        {generatedSecret && canManageWorkspace ? <Card className="border border-gray-200/80 p-6 dark:border-gray-800/80"><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick-start curl</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Use this key for webhook or gateway ingestion.</p></div><button onClick={() => copyText(sampleCurl, "Sample curl copied")} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200"><Copy size={16} />Copy sample</button></div><pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">{sampleCurl}</pre></Card> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border border-gray-200/80 p-6 dark:border-gray-800/80">
            <div className="mb-4 flex items-center gap-2"><KeyRound size={18} className="text-primary" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workspace API keys</h3></div>
            <div className="space-y-3">{canManageWorkspace ? (apiKeys.length ? apiKeys.map((item) => <div key={item._id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-semibold text-gray-900 dark:text-white">{item.label}</p><p className="text-sm text-gray-500 dark:text-gray-400">{item.prefix}...{item.lastFour}</p><p className="text-xs text-gray-500 dark:text-gray-400">Owner: {item.ownerName || "Workspace"} {item.ownerEmail ? `(${item.ownerEmail})` : ""}</p></div>{item.status === "ACTIVE" ? <button onClick={() => revokeKey(item._id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500">Revoke</button> : <span className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">{item.status}</span>}</div></div>) : <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No API keys issued yet.</div>) : <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">API key inventory sirf owners aur admins dekh sakte hain.</div>}</div>
          </Card>
          <Card className="border border-gray-200/80 p-6 dark:border-gray-800/80">
            <div className="mb-4 flex items-center gap-2"><ScrollText size={18} className="text-primary" /><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit feed</h3></div>
            <div className="space-y-3">{canViewAuditFeed ? (auditLogs.length ? auditLogs.map((log) => <div key={log._id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"><p className="font-semibold text-gray-900 dark:text-white">{log.action}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{log.category} | {log.status} | {new Date(log.createdAt).toLocaleString()}</p></div>) : <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No audit events yet.</div>) : <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Audit feed viewer role ke liye available nahi hai.</div>}</div>
          </Card>
        </div>
      </> : null}
    </div>
  );
};

export default Workspace;

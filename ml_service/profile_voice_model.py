# Enable postponed evaluation of type annotations (improves performance & avoids circular imports)

from __future__ import annotations

import math
import re
from collections import Counter, defaultdict

# Regex to extract tokens (English words, Hindi words, numbers)
TOKEN_RE = re.compile(r"[A-Za-z]+|[\u0900-\u097F]+|\d+")
# Regex to split sentences into segments using connectors like "and", "aur", "then", etc.
SPLIT_RE = re.compile(r"(?:,|;|/|\||\n|\band\b|\baur\b|\bthen\b|\bphir\b|\bfir\b|\balso\b|\bwith\b)+", re.IGNORECASE)


def normalize_text(value: object) -> str:
      """
    Normalize raw input text:
    - Remove newlines
    - Replace fancy quotes with standard ones
    - Remove invisible characters
    """
    return (
        str(value or "")
        .replace("\r", " ")
        .replace("\n", " ")
        .replace("“", '"')
        .replace("”", '"')
        .replace("’", "'")
        .replace("\u200b", " ")
        .strip()
    )


def compact_text(value: object) -> str:
    
    """
    Normalize text and remove extra spaces.
    """
    
    return re.sub(r"\s+", " ", normalize_text(value)).strip()


def tokenise(value: object) -> list[str]:
    text = compact_text(value).lower()
    if not text:
        return []
    tokens = [token.strip(".,;:!?।॥") for token in TOKEN_RE.findall(text)]
    return [token for token in tokens if token]

def trim_after_fillers(text: str, fillers: set[str]) -> str:
    
    """
    Stop extracting text once filler words are encountered.
    Example: "Rahul hai" → "Rahul"
    """
    
    tokens = tokenise(text)
    if not tokens:
        return ""
    out = []
    for token in tokens:
      if token.lower() in fillers:
          break
      out.append(token)
    return " ".join(out).strip(" .,;:!?")


def clean_candidate(text: str, fillers: set[str]) -> str:
    
      """
    Clean extracted candidate:
    - Remove prefixes
    - Remove fillers
    - Remove trailing punctuation
    """
    
    candidate = compact_text(text)
    if not candidate:
        return ""
    candidate = re.sub(r"^[\s:=-]+", "", candidate)
    candidate = trim_after_fillers(candidate, fillers)
    candidate = re.sub(r"[.,;:!?]+$", "", candidate).strip()
    return candidate


class NaiveBayesTextModel:

       """
    Simple Naive Bayes classifier for text classification.
    Used to classify input into:
    - name
    - building
    - other
    """
    
    def __init__(self) -> None:
         # Count of each class
        
        self.class_counts: Counter[str] = Counter()

        # Feature counts per class
        self.feature_counts: dict[str, Counter[str]] = defaultdict(Counter)

           # Total features per class
        self.feature_totals: Counter[str] = Counter()

         # Unique vocabulary
        self.vocabulary: set[str] = set()
        self.trained = False

    def _features(self, text: str) -> list[str]:

          """
        Extract features:
        - Unigrams (single words)
        - Bigrams (word pairs)
        """
        
        tokens = tokenise(text)
        feats = [f"tok:{token}" for token in tokens]
        feats.extend(f"bi:{a}_{b}" for a, b in zip(tokens, tokens[1:]))
        return feats

    def train(self, samples: list[tuple[str, str]]) -> None:

        """
        Train model with labeled samples.
        """
        
        self.class_counts.clear()
        self.feature_counts.clear()
        self.feature_totals.clear()
        self.vocabulary.clear()

        for text, label in samples:
            features = self._features(text)
            self.class_counts[label] += 1
            for feature in features:
                self.feature_counts[label][feature] += 1
                self.feature_totals[label] += 1
                self.vocabulary.add(feature)

        self.trained = bool(self.class_counts)

    def predict(self, text: str) -> tuple[str, float, dict[str, float]]:

          """
        Predict label for given text.
        Returns:
        - predicted label
        - confidence
        - probability distribution
        """
        
        if not self.trained:
            return "other", 0.0, {"other": 1.0}

       # Likelihood

        features = self._features(text)
        labels = list(self.class_counts.keys())
        vocab_size = max(1, len(self.vocabulary))
        total_samples = sum(self.class_counts.values()) or 1
        log_probs: dict[str, float] = {}

        for label in labels:
            log_prob = math.log((self.class_counts[label] + 1) / (total_samples + len(labels)))
            denom = self.feature_totals[label] + vocab_size
            for feature in features:
                log_prob += math.log((self.feature_counts[label][feature] + 1) / denom)
            log_probs[label] = log_prob

        # Convert log probs to normal probabilities
        peak_label = max(log_probs, key=log_probs.get)
        peak = log_probs[peak_label]
        exp_scores = {label: math.exp(score - peak) for label, score in log_probs.items()}
        total = sum(exp_scores.values()) or 1.0
        probs = {label: score / total for label, score in exp_scores.items()}
        confidence = probs.get(peak_label, 0.0)
        return peak_label, confidence, probs


class ProfileVoiceModel:

       """
    Main AI model to extract:
    - User name
    - Building name

    Works with:
    - NLP rules
    - Regex patterns
    - Naive Bayes classification
    """

    # Common filler words (ignored during extraction)

    NAME_FILLERS = {
        "hai",
        "hain",
        "hoon",
        "hun",
        "hu",
        "है",
        "हैं",
        "हूँ",
        "हुं",
        "ji",
        "जी",
        "please",
        "plz",
        "bro",
        "buddy",
        "sir",
        "madam",
        "aur",
        "and",
        "or",
        "kaho",
        "bolo",
        "batao",
        "bulao",
        "call",
        "me",
        "my",
        "name",
        "nameis",
        "submit",
        "save",
        "done",
        "okay",
        "ok",
    }

    BUILDING_FILLERS = {
        "hai",
        "hain",
        "hoon",
        "hun",
        "hu",
        "है",
        "हैं",
        "हूँ",
        "हुं",
        "ji",
        "जी",
        "please",
        "plz",
        "ka",
        "ki",
        "ke",
        "ko",
        "mein",
        "me",
        "par",
        "pe",
        "wala",
        "wali",
        "wale",
        "aur",
        "and",
        "or",
        "kaho",
        "bolo",
        "batao",
        "bulao",
        "submit",
        "save",
        "done",
        "okay",
        "ok",
    }

    ACTION_NOISE = {
        "dal",
        "daal",
        "diya",
        "diye",
        "diyah",
        "kya",
        "kr",
        "kar",
        "karo",
        "kardiya",
        "kar diya",
        "fill",
        "filled",
        "put",
        "enter",
        "save",
        "submit",
        "done",
        "add",
        "update",
        "set",
        "type",
        "bol",
        "bolo",
    }

    SHORT_BUILDING_PREFIXES = {
        "block",
        "wing",
        "floor",
        "tower",
        "phase",
        "room",
        "unit",
        "level",
        "flat",
        "suite",
        "section",
        "zone",
    }

    NAME_CUES = [
        re.compile(r"\b(my name is|call me|i am|i'm|im)\b", re.IGNORECASE),
        re.compile(r"\b(mera naam|mera name|naam|name)\b", re.IGNORECASE),
        re.compile(r"\b(मैं|main|mujhe)\b", re.IGNORECASE),
    ]

    BUILDING_CUES = [
        re.compile(r"\b(my building is|mera building|meri building|building is|building)\b", re.IGNORECASE),
        re.compile(r"\b(site|campus|college|कॉलेज|office|ऑफिस|कार्यालय|branch|block|ब्लॉक|place|location|venue|school|स्कूल|institute|संस्थान|university|विश्वविद्यालय|शाखा)\b", re.IGNORECASE),
        re.compile(r"(बिल्डिंग|भवन|कैंपस|लोकेशन|स्थान)", re.IGNORECASE),
    ]

    def __init__(self) -> None:

         # Initialize ML model
        
        self.model = NaiveBayesTextModel()
        
        # Training data
        self.samples = self._build_samples()

        # Train model
        self.model.train(self.samples)

    def _build_samples(self) -> list[tuple[str, str]]:

        """
        Create training dataset for:
        - name
        - building
        - other
        """
        names = ["rahul", "gautam", "gautam sagar", "amit", "neha", "rohan", "arjun", "sneha", "priya", "ankit"]
        buildings = [
            "sharda college",
            "hindustan college",
            "eshan college",
            "block a",
            "block b",
            "admin tower",
            "main office",
            "campus block",
            "jabalpur campus",
            "delhi ncr campus",
        ]
        samples: list[tuple[str, str]] = []
        name_templates = [
            "my name is {value}",
            "call me {value}",
            "i am {value}",
            "i'm {value}",
            "mera naam {value} hai",
            "mera name {value} hai",
            "naam {value}",
            "name {value}",
            "main {value} hoon",
            "mujhe {value} kaho",
            "mujhe {value} bulao",
            "मेरा नाम {value} है",
            "नाम {value}",
            "मैं {value} हूँ",
        ]
        building_templates = [
            "my building is {value}",
            "mera building {value} hai",
            "meri building {value} hai",
            "building {value}",
            "site {value}",
            "campus {value}",
            "college {value}",
            "office {value}",
            "branch {value}",
            "block {value}",
            "location {value}",
            "venue {value}",
            "building name {value}",
            "बिल्डिंग {value}",
            "भवन {value}",
            "कैंपस {value}",
            "लोकेशन {value}",
            "स्थान {value}",
        ]
        noise = [
            "submit",
            "save",
            "done",
            "clear draft",
            "hello",
            "hi",
            "good morning",
            "voice input",
            "profile draft",
            "thanks",
            "what can you do",
        ]

        for value in names:
            for template in name_templates:
                samples.append((template.format(value=value), "name"))
        for value in buildings:
            for template in building_templates:
                samples.append((template.format(value=value), "building"))
        for text in noise:

            
        # Noise data
            samples.append((text, "other"))
        return samples

    def _classify_segment(self, segment: str) -> tuple[str, float, dict[str, float]]:

        """
        Main function:
        Extract name & building from user input.

        Returns:
        - draft (name, building)
        - confidence score
        - segments analysis
        - missing fields (needs)
        """ 
        
        label, confidence, probs = self.model.predict(segment)
        return label, confidence, probs

    def _find_match(self, text: str, patterns: list[re.Pattern[str]]) -> tuple[str, int] | tuple[None, None]:
        for pattern in patterns:
            match = pattern.search(text)
            if match:
                return match.group(0), match.start()
        return None, None

    def _extract_after_pattern(self, text: str, patterns: list[re.Pattern[str]], stop_patterns: list[re.Pattern[str]] | None = None) -> str:
        source = compact_text(text)
        if not source:
            return ""
        stop_patterns = stop_patterns or []
        best = None
        for pattern in patterns:
            match = pattern.search(source)
            if not match:
                continue
            groups = [group for group in match.groups() if group]
            if groups:
                candidate = groups[-1]
            else:
                tail = source[match.end() :].strip()
                if not tail:
                    continue
                candidate = tail
            stopper = None
            for stop in stop_patterns:
                stop_match = stop.search(candidate)
                if stop_match and (stopper is None or stop_match.start() < stopper.start()):
                    stopper = stop_match
            candidate = candidate[: stopper.start()] if stopper else candidate
            candidate = compact_text(candidate)
            if candidate and (best is None or len(candidate) > len(best)):
                best = candidate
        return best or ""

    def _clean_name(self, text: str) -> str:
        return clean_candidate(text, self.NAME_FILLERS)

    def _clean_building(self, text: str) -> str:
        return clean_candidate(text, self.BUILDING_FILLERS.union(self.ACTION_NOISE))

    def _looks_like_name(self, text: str) -> bool:
        candidate = compact_text(text)
        if not candidate:
            return False
        lower = candidate.lower()
        if lower in self.NAME_FILLERS or lower in {"mera", "मेरे", "मेरा"}:
            return False
        if any(hint in lower for hint in ["building", "बिल्डिंग", "campus", "कैंपस", "college", "कॉलेज", "office", "ऑफिस", "कार्यालय", "block", "ब्लॉक", "tower", "floor", "phase", "room", "unit", "school", "स्कूल", "university", "विश्वविद्यालय", "institute", "संस्थान", "branch", "शाखा"]):
            return False
        if any(noise in lower for noise in self.ACTION_NOISE):
            return False
        tokens = tokenise(candidate)
        if len(tokens) == 0 or len(tokens) > 5:
            return False
        return True

    def _looks_like_building(self, text: str) -> bool:
        candidate = compact_text(text)
        if not candidate:
            return False
        lower = candidate.lower()
        if lower in self.BUILDING_FILLERS or lower in {"mera", "मेरे", "मेरा"}:
            return False
        if lower in {"building", "site", "campus", "office", "branch", "place", "location", "venue", "school", "institute", "university", "tower"}:
            return False
        if any(hint in lower for hint in ["college", "कॉलेज", "campus", "कैंपस", "building", "office", "ऑफिस", "कार्यालय", "block", "ब्लॉक", "school", "स्कूल", "university", "विश्वविद्यालय", "institute", "संस्थान", "tower", "branch", "शाखा"]):
            return True
        if any(noise in lower for noise in self.ACTION_NOISE):
            return False
        tokens = tokenise(candidate)
        if len(tokens) < 2 or len(tokens) > 5:
            return False
        if re.search(r"\d", candidate):
            return True
        return all(token[:1].isupper() for token in candidate.split() if token)

    def _strip_name_prefix(self, text: str) -> str:
        candidate = compact_text(text)
        if not candidate:
            return ""
        candidate = re.sub(
            r"^(?:my name is|call me|i am|i'm|im|mera naam|mera name|मेरा नाम|नाम|name|main|मैं|mujhe)\s*(?:is|hai|hoon|hun|hu|है|हूँ|हूं|:|=)?\s*",
            "",
            candidate,
            flags=re.IGNORECASE,
        )
        return candidate

    def _strip_building_prefix(self, text: str) -> str:
        candidate = compact_text(text)
        if not candidate:
            return ""
        candidate = re.sub(
            r"^(?:my building is|mera building|meri building|building is|building|site|campus|college|office|branch|block|place|location|venue|school|institute|university|बिल्डिंग|भवन|कैंपस|लोकेशन|स्थान)\s*(?:is|hai|ho|है|हैं|=|:|का|की|में|me|par|pe)?\s*",
            "",
            candidate,
            flags=re.IGNORECASE,
        )
        return candidate

    def parse(self, text: str, current: dict | None = None) -> dict:
        source = compact_text(text)
        draft = dict(current or {})
        draft.setdefault("name", "")
        draft.setdefault("building", "")
        if not source:
            return {"draft": draft, "confidence": 0.0, "segments": [], "needs": []}

        segments = [segment.strip() for segment in SPLIT_RE.split(source) if segment and segment.strip()]
        if not segments:
            segments = [source]

        segment_infos = []
        name_value = compact_text(draft.get("name") or "")
        building_value = compact_text(draft.get("building") or "")
        confidence_scores = []
        needs: set[str] = set()

        for segment in segments:
            label, confidence, probs = self._classify_segment(segment)
            confidence_scores.append(confidence)
            segment_infos.append({"text": segment, "label": label, "confidence": round(confidence * 100, 2), "scores": {k: round(v * 100, 2) for k, v in probs.items()}})

            if label == "name":
                candidate = self._extract_after_pattern(
                    segment,
                    [
                        re.compile(r"\b(my name is|call me|i am|i'm|im)\b\s*(.+)", re.IGNORECASE),
                        re.compile(r"\b(mera naam|mera name|naam|name)\b\s*(?:is|hai|=|:)?\s*(.+)", re.IGNORECASE),
                        re.compile(r"(मेरा नाम|नाम)\s*(?:is|hai|=|:|है|हूँ|हुं)?\s*(.+)", re.IGNORECASE),
                        re.compile(r"\b(मैं|main|mujhe)\b\s*(.+)", re.IGNORECASE),
                    ],
                    [re.compile(r"\b(building|site|campus|college|office|branch|block|place|location|venue|school|institute|university)\b", re.IGNORECASE)],
                )
                candidate = self._clean_name(self._strip_name_prefix(candidate or segment))
                if self._looks_like_name(candidate):
                    name_value = candidate
                elif re.search(r"\b(my name is|call me|i am|i'm|im|mera naam|mera name|naam|name|मेरा नाम|नाम|मैं|main|mujhe)\b", segment, re.IGNORECASE):
                    needs.add("name")
                    continue

            if label == "building":
                candidate = self._extract_after_pattern(
                    segment,
                    [
                        re.compile(r"\b(my building is|mera building|meri building|building is|building)\b\s*(?:is|hai|=|:)?\s*(.+)", re.IGNORECASE),
                        re.compile(r"\b(site|campus|college|कॉलेज|office|ऑफिस|कार्यालय|branch|block|ब्लॉक|place|location|venue|school|स्कूल|institute|संस्थान|university|विश्वविद्यालय|शाखा)\b\s*(?:is|hai|है|हैं|हूँ|हुं|=|:)?\s*(.+)", re.IGNORECASE),
                        re.compile(r"(बिल्डिंग|भवन|कैंपस|लोकेशन|स्थान)\s*(?:is|hai|=|:)?\s*(.+)", re.IGNORECASE),
                    ],
                    [re.compile(r"\b(my name is|call me|i am|i'm|im|mera naam|mera name|naam|name)\b", re.IGNORECASE)],
                )
                candidate = self._clean_building(self._strip_building_prefix(candidate or segment))
                segment_lower = segment.lower()
                if candidate and len(tokenise(candidate)) <= 2:
                    prefix = next((item for item in self.SHORT_BUILDING_PREFIXES if item in segment_lower), None)
                    if prefix and not candidate.lower().startswith(prefix):
                        candidate = self._clean_building(f"{prefix} {candidate}")
                if self._looks_like_building(candidate):
                    building_value = candidate
                elif re.search(r"\b(my building is|mera building|meri building|building is|building|site|campus|college|office|branch|block|place|location|venue|school|institute|university|बिल्डिंग|भवन|कैंपस|लोकेशन|स्थान)\b", segment, re.IGNORECASE):
                    needs.add("building")
                    continue

            if not name_value:
                name_candidate = self._extract_after_pattern(
                    segment,
                    [
                        re.compile(r"\b(my name is|call me|i am|i'm|im)\b\s*(.+)", re.IGNORECASE),
                        re.compile(r"\b(mera naam|mera name|naam|name)\b\s*(?:is|hai|=|:)?\s*(.+)", re.IGNORECASE),
                        re.compile(r"(मेरा नाम|नाम)\s*(?:is|hai|=|:|है|हूँ|हुं)?\s*(.+)", re.IGNORECASE),
                    ],
                )
                name_candidate = self._clean_name(self._strip_name_prefix(name_candidate or segment))
                if self._looks_like_name(name_candidate):
                    name_value = name_candidate
                elif re.search(r"\b(mera naam|my name is|call me|i am|i'm|im|naam|name|मेरा नाम|नाम|मैं|main|mujhe)\b", segment, re.IGNORECASE):
                    needs.add("name")
         # Split into smaller segments
            if not building_value:
                building_candidate = self._extract_after_pattern(
                    segment,
                    [
                        re.compile(r"\b(my building is|mera building|meri building|building is|building)\b\s*(?:is|hai|=|:)?\s*(.+)", re.IGNORECASE),
                        re.compile(r"\b(site|campus|college|कॉलेज|office|ऑफिस|कार्यालय|branch|block|ब्लॉक|place|location|venue|school|स्कूल|institute|संस्थान|university|विश्वविद्यालय|शाखा)\b\s*(?:is|hai|है|हैं|हूँ|हुं|=|:)?\s*(.+)", re.IGNORECASE),
                        re.compile(r"(बिल्डिंग|भवन|कैंपस|लोकेशन|स्थान)\s*(?:is|hai|=|:)?\s*(.+)", re.IGNORECASE),
                    ],
                )
                building_candidate = self._clean_building(self._strip_building_prefix(building_candidate or segment))
                segment_lower = segment.lower()
                if building_candidate and len(tokenise(building_candidate)) <= 2:
                    prefix = next((item for item in self.SHORT_BUILDING_PREFIXES if item in segment_lower), None)
                    if prefix and not building_candidate.lower().startswith(prefix):
                        building_candidate = self._clean_building(f"{prefix} {building_candidate}")
                if self._looks_like_building(building_candidate):
                    building_value = building_candidate
                elif re.search(r"\b(my building is|mera building|meri building|building is|building|site|campus|college|office|branch|block|place|location|venue|school|institute|university|बिल्डिंग|भवन|कैंपस|लोकेशन|स्थान)\b", segment, re.IGNORECASE):
                    needs.add("building")

        if not building_value:
            direct_building = self._clean_building(self._strip_building_prefix(source))
            if self._looks_like_building(direct_building):
                building_value = direct_building

        if not name_value:
            loose_name = self._extract_after_pattern(
                source,
                [
                    re.compile(r"\b(mera naam|my name is|call me|i am|i'm|im|naam|name)\b\s*(?:is|hai|=|:)?\s*(.+)", re.IGNORECASE),
                    re.compile(r"(मेरा नाम|नाम)\s*(?:is|hai|=|:|है|हूँ|हुं)?\s*(.+)", re.IGNORECASE),
                    re.compile(r"\b(मैं|main|mujhe)\b\s*(.+)", re.IGNORECASE),
                ],
            )
            loose_name = self._clean_name(self._strip_name_prefix(loose_name))
            if self._looks_like_name(loose_name) and not self._looks_like_building(loose_name):
                name_value = loose_name
            elif re.search(r"\b(mera naam|my name is|call me|i am|i'm|im|naam|name|मेरा नाम|नाम|मैं|main|mujhe)\b", source, re.IGNORECASE):
                needs.add("name")

        if not building_value:
            loose_building = self._extract_after_pattern(
                source,
                [
                    re.compile(r"\b(my building is|mera building|meri building|building is|building)\b\s*(?:is|hai|=|:)?\s*(.+)", re.IGNORECASE),
                    re.compile(r"\b(site|campus|college|कॉलेज|office|ऑफिस|कार्यालय|branch|block|ब्लॉक|place|location|venue|school|स्कूल|institute|संस्थान|university|विश्वविद्यालय|शाखा)\b\s*(?:is|hai|है|हैं|हूँ|हुं|=|:)?\s*(.+)", re.IGNORECASE),
                    re.compile(r"(बिल्डिंग|भवन|कैंपस|लोकेशन|स्थान)\s*(?:is|hai|=|:)?\s*(.+)", re.IGNORECASE),
                ],
            )
            loose_building = self._clean_building(self._strip_building_prefix(loose_building))
            if self._looks_like_building(loose_building):
                building_value = loose_building
            elif re.search(r"\b(my building is|mera building|meri building|building is|building|site|campus|college|office|branch|block|place|location|venue|school|institute|university|बिल्डिंग|भवन|कैंपस|लोकेशन|स्थान)\b", source, re.IGNORECASE):
                needs.add("building")

        # Average confidence
        
        confidence = round((sum(confidence_scores) / len(confidence_scores)) * 100.0 if confidence_scores else 0.0, 2)
        if name_value and building_value:
            confidence = min(99.0, confidence + 12.0)
        elif name_value or building_value:
            confidence = min(90.0, confidence + 5.0)

        return {
            "draft": {"name": name_value, "building": building_value},
            "confidence": confidence,
            "segments": segment_infos,
            "needs": sorted(needs),
        }

# Global instance (used across app)
PROFILE_VOICE_MODEL = ProfileVoiceModel()

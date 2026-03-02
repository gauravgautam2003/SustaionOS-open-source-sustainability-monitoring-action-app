import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBell, FiZap, FiDroplet, FiAlertCircle } from 'react-icons/fi';

const CircularProgress = ({ value, maxValue, label, color, icon }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const percentage = (value / maxValue) * 100;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="12"
                        fill="none"
                    />
                    <motion.circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke={color}
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{
                            strokeDasharray: circumference,
                        }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="text-white"
                    >
                        {icon}
                    </motion.div>
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        className="text-2xl font-bold text-white"
                    >
                        {Math.round(percentage)}%
                    </motion.span>
                </div>
            </div>
            <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="text-white text-sm font-medium"
            >
                {label}
            </motion.span>
        </div>
    );
};

const StockChart = ({ data = [], height = 220 }) => {
    if (!data || data.length === 0) return null;

    const padding = 16;
    const width = 800; // viewBox width; SVG scales responsively
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    const x = (i) => (i / (data.length - 1)) * innerW + padding;
    const y = (p) => padding + innerH - ((p - min) / (max - min || 1)) * innerH;

    const points = data.map((d, i) => `${x(i)},${y(d.price)}`).join(' ');

    const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.price)}`).join(' ');
    const latest = data[data.length - 1];
    const first = data[0];
    const up = latest.price >= first.price;
    const changePct = (((latest.price - first.price) / first.price) * 100).toFixed(2);

    return (
        <div className="w-full max-w-full">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <div className="text-sm text-gray-300">Live Market (Sample)</div>
                    <div className="text-lg md:text-xl font-semibold text-white">{latest.symbol || 'SUST'} <span className={`ml-3 text-sm ${up ? 'text-green-400' : 'text-red-400'}`}>{up ? '▲' : '▼'} {latest.price}</span></div>
                </div>
                <div className={`text-sm ${up ? 'text-green-400' : 'text-red-400'}`}>{up ? '+' : ''}{changePct}%</div>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px] md:h-[260px]">
                <defs>
                    <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={up ? '#10B981' : '#EF4444'} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={up ? '#10B981' : '#EF4444'} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                {/* area fill */}
                <path d={`${linePath} L ${x(data.length - 1)} ${padding + innerH} L ${x(0)} ${padding + innerH} Z`} fill="url(#areaGrad)" stroke="none" />

                {/* grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => (
                    <line key={idx} x1={padding} x2={width - padding} y1={padding + innerH * t} y2={padding + innerH * t} stroke="rgba(255,255,255,0.03)" />
                ))}

                {/* line */}
                <path d={linePath} fill="none" stroke={up ? '#10B981' : '#EF4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* points */}
                {data.map((d, i) => (
                    <circle key={i} cx={x(i)} cy={y(d.price)} r={i === data.length - 1 ? 3.5 : 2.2} fill={i === data.length - 1 ? (up ? '#10B981' : '#EF4444') : 'rgba(255,255,255,0.06)'} />
                ))}
            </svg>
        </div>
    );
};
const Dashboard = () => {
    const navigate = useNavigate();

    const cards = [
        {
            id: 1,
            title: 'Alerts',
            icon: <FiBell className="w-8 h-8" />,
            path: '/dashboard/alerts',
            description: 'View and manage system alerts'
        },
        {
            id: 2,
            title: 'Energy Analysis',
            icon: <FiZap className="w-8 h-8" />,
            path: '/dashboard/energy',
            description: 'Analyze energy consumption patterns'
        },
        {
            id: 3,
            title: 'Water Analysis',
            icon: <FiDroplet className="w-8 h-8" />,
            path: '/dashboard/water',
            description: 'Analyze water usage and efficiency'
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    return (
        <div className='relative min-h-screen pt-16 md:pt-20 lg:pt-24 bg-black/95 opacity-80 px-3 sm:px-4 md:px-6 lg:px-8'>
            <div className="bg-transparent mx-auto max-w-7xl py-1 lg:py-2">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6 md:mb-8 lg:mb-10 text-center px-2"
                >
                    Dashboard
                </motion.h1>
                <motion.div className='flex flex-col lg:flex-row w-full gap-4 md:gap-3 lg:gap-4 justify-center'>
                    <motion.div className='w-full lg:w-1/3 gap-4 md:gap-6'>
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 md:gap-5 lg:gap-6"
                        >
                            {cards.map((card) => (
                                <motion.button
                                    key={card.id}
                                    variants={itemVariants}
                                    whileHover={{
                                        scale: 1.02,
                                        transition: { duration: 0.1 }
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => navigate(card.path)}
                                    className="w-full bg-transparent border-2 border-white/20 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 lg:p-7 text-white hover:border-white/40 hover:bg-white/10 transition-all duration-300 flex flex-col items-center gap-3 md:gap-4 min-h-[160px] sm:min-h-[180px] md:min-h-[160px] justify-center"
                                >
                                    <motion.div
                                        whileHover={{ rotate: 15 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-blue-200"
                                    >
                                        {card.icon}
                                    </motion.div>
                                    <div className="text-center">
                                        <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-1 md:mb-2">{card.title}</h2>
                                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{card.description}</p>
                                    </div>
                                </motion.button>
                            ))}
                        </motion.div>
                    </motion.div>
                    <motion.div
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.01,
                            transition: { duration: 0.1 }
                        }}
                        whileTap={{ scale: 0.98 }}
                        className='w-full bg-transparent border-2 border-white/20 rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 lg:p-10 text-white hover:border-white/40 transition-all duration-300 flex flex-col items-center gap-4 md:gap-6 min-h-[300px] sm:min-h-[400px] md:min-h-[500px]'>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className='text-white/90 px-3 sm:px-4 md:px-6 bg-black/95 opacity-90 font-bold text-base sm:text-md md:text-xl lg:text-2xl text-center '
                        >
                            Sustainability Metrics at a Glance 

                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-8 md:gap-12 lg:gap-16 justify-center items-center w-full"
                        >
                            <CircularProgress 
                                value={75}
                                maxValue={100}
                                label="Water Efficiency"
                                color="#3B82F6"
                                icon={<FiDroplet className="w-10 h-10" />}
                            />
                            <CircularProgress 
                                value={62}
                                maxValue={100}
                                label="Energy Usage"
                                color="#F59E0B"
                                icon={<FiZap className="w-10 h-10" />}
                            />
                            <CircularProgress 
                                value={45}
                                maxValue={100}
                                label="Alerts Resolved"
                                color="#10B981"
                                icon={<FiAlertCircle className="w-10 h-10" />}
                            />
                        </motion.div>
                    </motion.div>
                </motion.div>

            </div>
        </div>
    );
};

export default Dashboard;

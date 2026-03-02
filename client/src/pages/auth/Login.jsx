import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock } from 'react-icons/fi';
import { login as loginUser } from '../../services/authService';
import useAuth from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import { RxCross2 } from 'react-icons/rx';

const Login = () => {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await loginUser(formData);
            if (response.success) {
                setUser(response.user);
                localStorage.setItem('token', response.token);
                navigate('/');
            } else {
                setError(response.message || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 },
        },
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full min-h-screen relative bg-black/95 flex items-center justify-center px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8"
        >
            <RxCross2 className='absolute right-3 sm:right-4 md:right-6 top-3 sm:top-4 text-white font-bold text-xl sm:text-2xl cursor-pointer hover:text-gray-300 transition' onClick={() => navigate("/dashboard")} />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-xs sm:max-w-sm md:max-w-md shadow-2xl rounded-lg overflow-hidden"
            >
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-black/95 rounded-lg shadow-lg p-6 sm:p-7 md:p-8 border-2 border-gray-700"
                >
                    {/* Header */}
                    <motion.div variants={itemVariants} className="mb-6 md:mb-8 text-center">
                        <motion.h1
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 md:mb-2"
                            initial={{ y: -20 }}
                            animate={{ y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        >
                            SustainOS
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-xs sm:text-sm md:text-base text-gray-100">
                            Welcome back
                        </motion.p>
                    </motion.div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-100 border border-red-400 text-red-700 text-xs sm:text-sm rounded"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                        {/* Email Field */}
                        <motion.div variants={itemVariants}>
                            <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-100 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <FiMail className="absolute left-3 top-2.5 text-white text-sm" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-9 sm:pl-10 pr-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-300"
                                />
                            </div>
                        </motion.div>

                        {/* Password Field */}
                        <motion.div variants={itemVariants}>
                            <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-white mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-3 top-2.5 text-white text-sm" />
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-9 sm:pl-10 pr-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-300"
                                />
                            </div>
                        </motion.div>

                        {/* Submit Button */}
                        <motion.button
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium text-sm sm:text-base py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-4 sm:mt-5"
                        >
                            {loading ? <Loader /> : 'Sign In'}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <motion.div variants={itemVariants} className="my-4 sm:my-5 md:my-6 flex items-center gap-2 sm:gap-3">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <div className="px-1 sm:px-2 text-xs sm:text-sm text-gray-200 font-bold whitespace-nowrap">Don't have an account?</div>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </motion.div>

                    {/* Register Link */}
                    <motion.div variants={itemVariants}>
                        <Link
                            to="/register"
                            className="w-full block text-center bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium text-sm sm:text-base py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition duration-200"
                        >
                            Create Account
                        </Link>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default Login;
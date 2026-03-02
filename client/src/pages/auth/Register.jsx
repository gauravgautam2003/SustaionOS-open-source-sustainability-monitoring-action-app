import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiBriefcase } from 'react-icons/fi';
import { register as registerUser } from '../../services/authService';
import useAuth from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import { RxCross2 } from "react-icons/rx";


const Register = () => {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        organizationName: '',
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

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await registerUser({
                email: formData.email,
                password: formData.password,
                organizationName: formData.organizationName,
            });

            if (response.success) {
                setUser(response.user);
                localStorage.setItem('token', response.token);
                navigate('/');
            } else {
                setError(response.message || 'Registration failed');
            }
        } catch (err) {
            setError(err.message || 'An error occurred during registration');
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
            className="w-full min-h-screen relative bg-black/90  flex items-center justify-center px-4"
        >
            <RxCross2 className='absolute right-4 top-2 font-bold text-2xl text-white ' onClick={() => navigate("/dashboard")} />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-md shadow-2xl rounded-lg overflow-hidden"
            >
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-transparent border-2 border-gray-400 rounded-lg shadow-lg p-8"
                >
                    {/* Header */}
                    <motion.div variants={itemVariants} className="mb-8 text-center">
                        <motion.h1
                            className="text-3xl font-bold text-white"
                            initial={{ y: -20 }}
                            animate={{ y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        >
                            SustainOS
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-gray-200">
                            Create your account
                        </motion.p>
                    </motion.div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-2 ">
                        {/* Email Field */}
                        <motion.div variants={itemVariants}>
                            <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <FiMail className="absolute left-3 top-3 text-white font-extrabold" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-white"
                                />
                            </div>
                        </motion.div>

                        {/* Organization Name Field */}
                        <motion.div variants={itemVariants}>
                            <label htmlFor="organization" className="block text-sm font-medium text-white mb-1">
                                Organization Name
                            </label>
                            <div className="relative">
                                <FiBriefcase className="absolute left-3 top-3 text-gray-100 font-extrabold" />
                                <input
                                    type="text"
                                    id="organization"
                                    name="organizationName"
                                    value={formData.organizationName}
                                    onChange={handleChange}
                                    placeholder="Your company name"
                                    required
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-white"
                                />
                            </div>
                        </motion.div>

                        {/* Password Field */}
                        <motion.div variants={itemVariants}>
                            <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-3 top-3 text-gray-100 font-extrabold" />
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500
                                    placeholder-white"
                                />
                            </div>
                        </motion.div>

                        {/* Confirm Password Field */}
                        <motion.div variants={itemVariants}>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-1">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-3 top-3 text-gray-100 font-extrabold" />
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500
                                    placeholder-white "
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
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? <Loader /> : 'Create Account'}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <motion.div variants={itemVariants} className="my-6 flex items-center">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <div className="px-2 text-sm text-gray-100 font-bold">Already have an account?</div>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </motion.div>

                    {/* Login Link */}
                    <motion.div variants={itemVariants}>
                        <Link
                            to="/login"
                            className="w-full block text-center bg-white  hover:bg-gray-200 text-black/90 font-bold py-2 px-4 rounded-lg transition duration-200"
                        >
                            Sign In
                        </Link>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default Register;

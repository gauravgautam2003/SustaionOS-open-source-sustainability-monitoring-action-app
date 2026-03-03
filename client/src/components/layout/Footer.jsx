import React from 'react';
import { motion } from 'framer-motion';
import {
    FaLeaf,
    FaTwitter,
    FaLinkedin,
    FaGithub,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt
} from 'react-icons/fa';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Buildings', path: '/buildings' },
        { name: 'Reports', path: '/reports' },
        { name: 'Settings', path: '/settings' },
    ];

    const socialLinks = [
        { icon: FaTwitter, href: '#', label: 'Twitter' },
        { icon: FaLinkedin, href: '#', label: 'LinkedIn' },
        { icon: FaGithub, href: '#', label: 'GitHub' },
    ];

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
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: 'easeOut',
            },
        },
    };

    const linkHoverVariants = {
        hover: {
            x: 5,
            color: '#10B981',
            transition: {
                duration: 0.2,
            },
        },
    };

    const iconHoverVariants = {
        hover: {
            scale: 1.2,
            color: '#10B981',
            transition: {
                duration: 0.2,
            },
        },
    };

    return (
        <footer className="relative w-full bottom-0 bg-black/95 opacity-95 text-white">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-10 md:py-12 lg:py-16 bg-transparent">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10"
                >
                    {/* Company Info */}
                    <motion.div variants={itemVariants} className="space-y-3 sm:space-y-4">
                        <motion.div
                            className="flex items-center space-x-2"
                            whileHover={{ scale: 1.02 }}
                        >
                            <FaLeaf className="text-green-500 text-xl sm:text-2xl" />
                            <span className="text-lg sm:text-xl font-bold">SustainOS</span>
                        </motion.div>
                        <p className="text-gray-100 text-xs sm:text-sm leading-relaxed px-1">
                            Building a sustainable future through intelligent energy management and environmental monitoring.
                        </p>
                        <div className="flex space-x-3 sm:space-x-4 pt-2">
                            {socialLinks.map((social) => (
                                <motion.a
                                    key={social.label}
                                    href={social.href}
                                    aria-label={social.label}
                                    variants={iconHoverVariants}
                                    whileHover="hover"
                                    whileTap={{ scale: 0.9 }}
                                    className="text-gray-100 text-xl"
                                >
                                    <social.icon />
                                </motion.a>
                            ))}
                        </div>
                    </motion.div>

                    {/* Quick Links */}
                    <motion.div variants={itemVariants} className="space-y-3 sm:space-y-4">
                        <h3 className="text-base sm:text-lg font-semibold text-green-500">Quick Links</h3>
                        <ul className="space-y-1 sm:space-y-2">
                            {footerLinks.map((link) => (
                                <li key={link.name}>
                                    <motion.a
                                        href={link.path}
                                        variants={linkHoverVariants}
                                        whileHover="hover"
                                        className="text-gray-100 text-xs sm:text-sm hover:text-green-500 transition-colors cursor-pointer block px-1"
                                    >
                                        {link.name}
                                    </motion.a>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Contact Info */}
                    <motion.div variants={itemVariants} className="space-y-3 sm:space-y-4">
                        <h3 className="text-base sm:text-lg font-semibold text-green-500">Contact Us</h3>
                        <ul className="space-y-2 sm:space-y-3">
                            <motion.li
                                className="flex items-center space-x-3 text-white text-sm cursor-pointer"
                                whileHover={{ x: 5 }}
                            >
                                <FaEnvelope className="text-green-600" />
                                <span>support@sustainos.com</span>
                            </motion.li>
                            <motion.li
                                className="flex items-center space-x-3 text-white text-sm cursor-pointer"
                                whileHover={{ x: 5 }}
                            >
                                <FaPhone className="text-green-600" />
                                <span>+1 (555) 123-4567</span>
                            </motion.li>
                            <motion.li
                                className="flex items-center space-x-3 text-white cursor-pointer text-sm"
                                whileHover={{ x: 5 }}
                            >
                                <FaMapMarkerAlt className="text-green-600" />
                                <span>123 Green Street, Eco City</span>
                            </motion.li>
                        </ul>
                    </motion.div>

                    {/* Newsletter */}
                    <motion.div variants={itemVariants} className="space-y-3 sm:space-y-4">
                        <h3 className="text-base sm:text-lg font-semibold text-green-500">Stay Updated</h3>
                        <p className="text-white text-xs sm:text-sm px-1">
                            Subscribe to our newsletter for the latest sustainability tips and updates.
                        </p>
                        <motion.form
                            className="flex flex-col space-y-2"
                            whileHover={{ scale: 1.01 }}
                        >
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="px-3 py-2 text-sm rounded-lg placeholder-white bg-transparent text-white border border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <motion.button
                                type="submit"
                                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Subscribe
                            </motion.button>
                        </motion.form>
                    </motion.div>
                </motion.div>

                {/* Bottom Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-8 border-t border-gray-700"
                >
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0 px-1">
                        <p className="text-gray-400 text-xs sm:text-sm">
                            © {currentYear} SustainOS. All rights reserved.
                        </p>
                        <div className="flex space-x-4 md:space-x-6">
                            <motion.a
                                href="#"
                                className="text-gray-400 text-xs sm:text-sm hover:text-green-500 transition-colors"
                                whileHover={{ y: -2 }}
                            >
                                Privacy Policy
                            </motion.a>
                            <motion.a
                                href="#"
                                className="text-gray-400 text-xs sm:text-sm hover:text-green-500 transition-colors"
                                whileHover={{ y: -2 }}
                            >
                                Terms of Service
                            </motion.a>
                            <motion.a
                                href="#"
                                className="text-gray-400 text-xs sm:text-sm hover:text-green-500 transition-colors"
                                whileHover={{ y: -2 }}
                            >
                                Cookie Policy
                            </motion.a>
                        </div>
                    </div>
                </motion.div>
            </div>
        </footer>
    );
};

export default Footer;

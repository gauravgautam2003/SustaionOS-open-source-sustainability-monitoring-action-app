import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes, FaUser, FaLeaf } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';


const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [forceVisible, setForceVisible] = useState(false);
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);
    const timerId = useRef(null);
    const navigate = useNavigate();

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const navLinks = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Buildings', path: '/buildings' },
        { name: 'Reports', path: '/reports' },
        { name: 'Settings', path: '/settings' },
    ];

    const menuVariants = {
        closed: {
            opacity: 0,
            x: '100%',
            transition: {
                duration: 0.3,
                ease: 'easeInOut',
            },
        },
        open: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.3,
                ease: 'easeInOut',
            },
        },
    };

    const linkVariants = {
        closed: {
            opacity: 0,
            x: 20,
        },
        open: (i) => ({
            opacity: 1,
            x: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.3,
            },
        }),
    };
    useEffect(() => {
        const homeSection = document.querySelector("#home");
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setForceVisible(true);
                } else {
                    setForceVisible(false);
                }
            }, { threshold: 0.1 }
        )
        if (homeSection) observer.observe(homeSection);
        return () => {
            if (homeSection) observer.unobserve(homeSection);
        }
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            if (forceVisible) {
                setVisible(true);
                return
            }
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current) {
                setVisible(false);
            } else {
                setVisible(true);
                if (timerId.current) clearTimeout(timerId.current);
                timerId.current = setTimeout(() => {
                    setVisible(false);
                }, 3000)
            }
            lastScrollY.current = currentScrollY;
        }
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (timerId.current) clearTimeout(timerId.current);
        }
    }, [forceVisible])

    return (
        <nav className={`fixed shadow-md top-0 left-0 right-0 z-50 bg-black/95 opacity-80 transition-transform  duration-300 ${visible ? "translate-y-0" : "-translate-y-full"}`}>
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 bg-transparent">
                <div className="flex justify-between items-center h-14 sm:h-16 md:h-20">
                    {/* Logo */}
                    <motion.div
                        className="flex-shrink-0 flex items-center cursor-pointer"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        <FaLeaf className="text-green-600 text-lg sm:text-xl md:text-2xl mr-1 sm:mr-2" />
                        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-200 hidden sm:inline">SustainOS</h1>
                    </motion.div>

                    {/* Desktop Menu */}
                    <div className="hidden md:block">
                        <div className="ml-6 lg:ml-10 flex items-baseline space-x-2 lg:space-x-4">
                            {navLinks.map((link, index) => (
                                <motion.div
                                    key={link.name}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1, duration: 0.3 }}
                                >
                                    <a
                                        href={link.path}
                                        className="text-gray-300 hover:text-green-600 hover:bg-gray-100 px-2 md:px-3 py-2 rounded-md text-xs md:text-sm font-semibold transition-colors duration-200"
                                    >
                                        {link.name}
                                    </a>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* User Icon - Desktop */}
                    <motion.div
                        className="hidden md:block"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <button className="p-2 rounded-full transition-colors duration-200 hover:text-green-600" onClick={() => navigate("/register")}>
                            <FaUser className="text-gray-200 text-xl" onClick={() => navigate("/register")} />
                        </button>
                    </motion.div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <motion.button
                            onClick={toggleMenu}
                            className="p-2 rounded-md hover:bg-gray-100 focus:outline-none"
                            whileTap={{ scale: 0.9 }}
                        >
                            {isOpen ? (
                                <FaTimes className="text-gray-100 text-xl" />
                            ) : (
                                <FaBars className="text-gray-100 text-xl" />
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>

            <div className='w-full border border-white bg-black/95 opacity-80'></div>
            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (

                    <div className='fixed  w-full min-h-screen  bg-black/95 opacity-80'>
                        <motion.div
                            className="md:hidden bg-transparent inset-0 top-16 shadow-lg"
                            variants={menuVariants}
                            initial="closed"
                            animate="open"
                            exit="closed"
                        >
                            <div className="px-4 pt-6 pb-4 space-y-2">
                                {navLinks.map((link, index) => (
                                    <motion.a
                                        key={link.name}
                                        href={link.path}
                                        custom={index}
                                        variants={linkVariants}
                                        initial="closed"
                                        animate="open"
                                        exit="closed"
                                        className="block px-4 py-3 text-base font-medium text-gray-100  rounded-md transition-colors duration-200"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {link.name}
                                    </motion.a>
                                ))}
                                <motion.div
                                    custom={navLinks.length}
                                    variants={linkVariants}
                                    initial="closed"
                                    animate="open"
                                    exit="closed"
                                    className="pt-4 border-t border-gray-200"
                                >
                                    <button className="flex items-center px-4 py-3 text-base font-medium text-gray-100 rounded-md w-full transition-colors duration-200 justify-start" onClick={() => navigate("/register")}>
                                        <FaUser className="mr-2" onClick={() => navigate("/register")} />
                                        Profile
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;

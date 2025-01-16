"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/utils/user';
import styles from '@/styles/signin.module.css';

export default function LoginPage() {
    const [credentials, setCredentials] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, Err] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        Err(null);
        setLoading(true);
        try {
            await login(credentials, password);
            router.push('/dashboard');
        } catch (err: unknown) {
            if (err instanceof Error) {
                Err(err.message || 'Login failed. Please try again.');
            } else {
                Err('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }; return (
        <div className={styles.localBody}>
            <div className={styles.container}>
                <div className={styles.bar}>
                    <p>Welcome to GraphQL!</p>
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 8 7" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2"><path d="M1 6V5h1V4h1V3h2v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1zm0-4V1H0V0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H2V2H1z" /></svg>
                </div>
                <h1 className={styles.title}>SIGN IN</h1>
                <form onSubmit={handleLogin} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="credentials" className={styles.label}>
                            Username/Email
                        </label>
                        <input
                            type="text"
                            id="credentials"
                            value={credentials}
                            onChange={(e) => setCredentials(e.target.value)}
                            required
                            className={styles.input}
                            placeholder="Enter your username or email"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={styles.input}
                            placeholder="Enter your password"
                        />
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className={styles.button}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

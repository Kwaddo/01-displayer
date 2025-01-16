// pages/index.tsx
'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Windows98Splash from '@/components/splash';

const Index = () => {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setShowSplash(false);

      try {
        const response = await fetch('/api/initDb');
        const data = await response.json();

        if (response.ok) {
          console.log(data.message);
        } else {
          console.error('API Error:', data.error);
        }

        const token = localStorage.getItem('jwtToken');
        if (!token) {
          router.replace('/signin');
        } else {
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      {showSplash && <Windows98Splash />} 
    </>
  );
};

export default Index;

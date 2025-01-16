import { useEffect, useState } from 'react';
import styles from '@/styles/splash.module.css';

const Windows98Splash: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true);
    }, 3000);
  }, []);

  if (isLoaded) {
    return null;
  }

  return (
    <div className={styles.splash}>
      <div className={styles.window}>
        <div className={styles.header}>Windows 98</div>
        <div className={styles.content}>
          <div className={styles.loadingText}>Loading...</div>
        </div>
      </div>
    </div>
  );
};

export default Windows98Splash;

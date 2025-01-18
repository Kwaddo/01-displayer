"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchGraphQL } from '@/utils/info';
import { logout } from '@/utils/user';
import styles from '@/styles/home.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOut, faBarChart, faChartLine, faTrophy, faGamepad, faNoteSticky, faPalette, faGun } from '@fortawesome/free-solid-svg-icons';
import Minesweeper from '@/components/minesweeper';
import Windows98Splash from '@/components/splash';
import SpaceInvaders from '@/components/invaders';

interface Group {
  campus: string;
  captainId: number;
  captainLogin: string;
  createdAt: string;
  eventId: number;
  id: number;
  objectId: number;
  path: string;
  status: string;
  updatedAt: string;
}

interface User {
  auditRatio: number;
  email: string;
  firstName: string;
  lastName: string;
  login: string;
  totalDown: number;
  totalUp: number;
  groupsByCaptainid: Group[];
  TransactionsFiltered1: { amount: number; type: string; path: string }[];
  TransactionsFiltered2: { amount: number; type: string; path: string }[];
}

interface XpData {
  xp: number;
  count: number;
}

interface GameData {
  name: string;
  level: number;
  attempts: number;
}

interface ApexTooltipSeriesData {
  x: string;
  y: number;
  level: number;
  attempts: number;
}

interface ApexTooltipSeries {
  data: ApexTooltipSeriesData[];
}

interface ApexTooltipConfig {
  series: ApexTooltipSeries[];
}

interface ApexTooltip {
  seriesIndex: number;
  dataPointIndex: number;
  w: {
    config: ApexTooltipConfig;
  };
}

const query = `query User {
  user {
      auditRatio
      email
      firstName
      lastName
      login
      totalDown
      totalUp
      groupsByCaptainid {
          campus
          captainId
          captainLogin
          createdAt
          eventId
          id
          objectId
          path
          status
          updatedAt
      }
      TransactionsFiltered1: transactions(where: {type: {_eq: "xp"}, path: { _like: "%bh-module%", _nregex: "^.*(piscine-js/|piscine-rust/|piscine-ui/|piscine-ux/).*$" }}) {
          amount
          type
      		path
      }
      TransactionsFiltered2: transactions(where: {type: {_eq: "level"},  path: { _like: "%bh-module%", _nregex: "^.*(piscine-js/|piscine-rust/|piscine-ui/|piscine-ux/).*$" }}, order_by: {amount: desc}, limit: 1) {
          amount
         type
         path
      }
  }
  event_user(where: { eventId: { _in: [72, 20, 250] } }) {
      level
      userId
      userLogin
      eventId
  }
  transaction {
      amount
      path
      type
      userLogin
      eventId
  }
  toad_session_game_results {
    level
    result {
      name
    }
    attempts
  }
}`;

export default function HomePage() {
  useEffect(() => {
    setIsClient(true);
    document.body.classList.add('dashboard-background');
    return () => {
      document.body.classList.remove('dashboard-background');
    };
  }, []);
  const [userData, setUserData] = useState<User | null>(null);
  const [xpDistribution, setXpDistribution] = useState<XpData[]>([]);
  const [gameData, setGameData] = useState<GameData[]>([]);
  const [xpAmount, setXpAmount] = useState<number>(0);
  const [levelAmount, setLevelAmount] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [lastProject, setLastProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [notebookContent, setNotebookContent] = useState('');
  const [colorId, getColor] = useState<number>(0);
  const [color, setColor] = useState<number>(0);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();
  const barChartRef = useRef(null);
  const xpChartRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setShowSplash(false);
    }, 3000)
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (!isClient) return;

    const fetchData = async () => {
      try {
        const token = window?.localStorage?.getItem('jwtToken');
        if (!token) {
          router.replace('/signin');
          return;
        }
        const data = await fetchGraphQL(query);
        if (data?.user && data.user.length > 0) {
          const loggedInUser = data.user[0] as User;
          loggedInUser.auditRatio = parseFloat(loggedInUser.auditRatio.toFixed(1));
          setUserData(loggedInUser);
          const totalXP = data.user[0].TransactionsFiltered1.reduce((acc: number, transaction: { amount: number }) => {
            return acc + transaction.amount;
          }, 0);
          setXpAmount(totalXP);
          const level = parseFloat(data.user[0].TransactionsFiltered2[0].amount.toFixed(3));
          setLevelAmount(level);
          const path = data.user[0].TransactionsFiltered2[0].path;
          const newPath = path.substring(path.lastIndexOf('/') + 1);
          const formattedPath = newPath
            .replace(/-/g, ' ')
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          setLastProject(formattedPath);
          const xpCounts = data.event_user.reduce((acc: { [level: number]: number }, event: { level: number }) => {
            acc[event.level] = (acc[event.level] || 0) + 1;
            return acc;
          }, {});
          const xpData = Object.entries(xpCounts).map(([xp, count]) => ({
            xp: parseFloat(xp),
            count: typeof count === 'number' ? count : parseFloat(String(count)),
          })).sort((a, b) => b.xp - a.xp);
          setXpDistribution(xpData);
          const gData = data?.toad_session_game_results.map((result: { result: { name: string }, level: number, attempts: number }) => ({
            name: result.result.name,
            level: result.level,
            attempts: result.attempts,
          })) || [];
          setGameData(gData);
        } else {
          throw new Error('User data not found.');
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load user data.');
      } finally {
        setLoading(false);
      }
    }; fetchData();
  }, [router, isClient]);

  const [fullscreenState, setFullscreenState] = useState({
    container1: false,
    container2: false,
    chartContainer1: false,
    chartContainer2: false,
    chartContainer3: false,
    container3: false,
    container4: false,
    container5: false,
  });

  const [visibleState, setVisibleState] = useState({
    container1: true,
    container2: true,
    chartContainer1: true,
    chartContainer2: true,
    chartContainer3: true,
    container3: false,
    container4: false,
    container5: false,
  });
  const colorMap: { [key: number]: number } = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
  };
  const [prevVisibilityState, setPrevVisibilityState] = useState<Record<string, boolean>>({});

  const toggleFullscreen = (container: string) => {
    setFullscreenState(prevState => {
      const newState = { ...prevState };
      if (!prevState[container as keyof typeof prevState]) {
        Object.keys(prevState).forEach(key => {
          if (key !== container) {
            newState[key as keyof typeof prevState] = false;
          }
        });
      }
      newState[container as keyof typeof prevState] = !prevState[container as keyof typeof prevState];
      return newState;
    });
    setVisibleState(prevState => {
      const newVisibleState = { ...prevState };
      if (!fullscreenState[container as keyof typeof prevState]) {
        setPrevVisibilityState(prevState);
        Object.keys(prevState).forEach(key => {
          if (key !== container) {
            newVisibleState[key as keyof typeof prevState] = false;
          }
        });
      } else {
        Object.keys(prevState).forEach(key => {
          if (key !== container) {
            newVisibleState[key as keyof typeof prevState] = prevVisibilityState[key] ?? true;
          }
        });
      }
      return newVisibleState;
    });
  };

  const toggleVisibility = (containerName: string) => {
    setVisibleState((prevState) => {
      const newVisibleState = { ...prevState };
      newVisibleState[containerName as keyof typeof newVisibleState] = !prevState[containerName as keyof typeof prevState];
      const fullscreenContainer = Object.keys(fullscreenState).find(
        (key) => fullscreenState[key as keyof typeof fullscreenState]
      );

      if (fullscreenContainer) {
        setFullscreenState((prevFullscreenState) => ({
          ...prevFullscreenState,
          [fullscreenContainer]: false,
        }));
        Object.keys(prevVisibilityState).forEach((key) => {
          if (key !== fullscreenContainer) {
            newVisibleState[key as keyof typeof newVisibleState] = prevVisibilityState[key];
          }
        });
      }

      return newVisibleState;
    });
  };

  useEffect(() => {
    const userToken = localStorage.getItem('jwtToken');
    const userId = userData?.login;
    if (isDbInitialized && userId && userToken) {
      const insertUserData = async () => {
        try {
          const response = await fetch('/api/insertUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, token: userToken }),
          });

          const data = await response.json();
          if (response.ok) {
            console.log(data.message);
            const fetchNotes = async () => {
              try {
                const response = await fetch('/api/getNotes', {
                  method: 'GET',
                  headers: {
                    'Authorization': userId,
                  },
                });

                const data = await response.json();
                if (response.ok) {
                  setNotebookContent(data.notebookcontent || '');
                } else {
                  setError(data.error || 'Failed to fetch notebook content');
                }
              } catch (error) {
                setError('An error occurred while fetching notes: ' + error);
              }
            };
            const fetchColor = async () => {
              try {
                const response = await fetch('/api/getColor', {
                  method: 'GET',
                  headers: {
                    'Authorization': userId,
                  },
                });

                const data = await response.json();
                if (response.ok) {
                  getColor(data.colorId || '');
                } else {
                  setError(data.error || 'Failed to fetch color');
                }
              } catch (error) {
                setError('An error occurred while fetching color: ' + error);
              }
            };

            fetchNotes();
            fetchColor();
          } else {
            setError(data.error || 'Failed to insert user data');
          }
        } catch (error) {
          setError('Error inserting user data: ' + error);
        }
      };

      insertUserData();
    }
  }, [isDbInitialized, userData]);

  useEffect(() => {
    if (!isClient) return;
    if (userData && xpDistribution.length > 0) {
      if (visibleState.chartContainer1) {
        import('apexcharts').then((ApexCharts) => {
          const barChartOptions = {
            chart: {
              type: 'bar',
              height: '100%',
              width: 600,
              toolbar: { show: false },
            },
            series: [
              {
                name: 'Audit Ratio',
                data: [
                  {
                    x: 'Done',
                    y: userData.totalUp / 1000,
                  },
                  {
                    x: 'Received',
                    y: userData.totalDown / 1000,
                    fillColor: '#FF3D3D',
                  },
                ],
                zIndex: 5,
              },
            ],
            dataLabels: {
              enabled: false,
            },
            plotOptions: {
              bar: {
                horizontal: true,
                borderRadius: 4,
                barHeight: '70%',
              },
            },
            xaxis: {
              labels: {
                style: {
                  fontSize: '14px',
                  fontFamily: '"MS Sans Serif", sans-serif',
                },
                show: false,
              },
              tickAmount: 0,
              axisTicks: {
                show: false
              }
            },
            yaxis: {
              categories: ['Done', 'Received'],
              labels: {
                style: {
                  fontSize: '14px',
                  fontFamily: '"MS Sans Serif", sans-serif',
                  fontWeight: 'bold',
                },
              },
            },
            colors: ['#008080'],
            responsive: [
              {
                breakpoint: 1024,
                options: {
                  chart: {
                    width: '77.5%',
                  },
                  plotOptions: {
                    bar: {
                      horizontal: true,
                      borderRadius: 4,
                    },
                  },
                },
              },
              {
                breakpoint: 480,
                options: {
                  chart: {
                    width: '77.5%',
                  },
                },
              },
            ],
          };

          const barChart = new ApexCharts.default(barChartRef.current, barChartOptions);
          barChart.render();

          return () => {
            barChart.destroy();
          };
        });
      }
      if (visibleState.chartContainer2) {
        import('apexcharts').then((ApexCharts) => {
          const xpChartOptions = {
            chart: {
              type: 'bar',
              height: '100%',
              width: 600,
              toolbar: { show: false },
            },
            series: [{
              name: 'Users',
              data: xpDistribution
                .slice()
                .reverse()
                .map((item) => ({
                  x: item.xp.toString(),
                  y: item.count,
                  fillColor: item.xp.toString() === levelAmount.toString() ? '#4D6269' : '#29353C',
                })),
            }],
            dataLabels: {
              enabled: false,
            },
            plotOptions: {
              bar: {
                horizontal: false,
                borderRadius: 4,
              },
            },
            xaxis: {
              title: {
                text: 'User',
                style: {
                  fontSize: '24px',
                  fontFamily: '"MS Sans Serif", sans-serif',
                  fontWeight: 'bold',
                },
              },
              labels: {
                show: false,
              }
            },
            yaxis: {
              title: {
                text: 'User Level',
                style: {
                  fontSize: '24px',
                  fontFamily: '"MS Sans Serif", sans-serif',
                  fontWeight: 'bold',
                },
              },
              categories: xpDistribution
                .slice()
                .reverse()
                .map((item) => item.xp.toString()),
              labels: {
                show: false,
                rotate: 0,
              },
            },
            colors: [undefined],
            responsive: [
              {
                breakpoint: 768,
                options: {
                  chart: {
                    width: '77.5%',
                  },
                  plotOptions: {
                    bar: {
                      horizontal: true,
                      borderRadius: 4,
                    },
                  },
                  yaxis: {
                    labels: {
                      show: true,
                    },
                  },
                  xaxis: {
                    labels: {
                      show: true,
                    }
                  },
                },
              },
              {
                breakpoint: 480,
                options: {
                  chart: {
                    width: '77.5%',
                  },
                  yaxis: {
                    labels: {
                      show: true,
                    },
                  },
                  xaxis: {
                    labels: {
                      show: true,
                    }
                  },
                },
              },
            ],
          };

          const xpChart = new ApexCharts.default(xpChartRef.current, xpChartOptions);
          xpChart.render();

          const totalUsers = xpDistribution.reduce((acc, item) => acc + item.count, 0);
          setTotalUsers(totalUsers);

          return () => {
            xpChart.destroy();
          };
        });
      }
      if (visibleState.chartContainer3) {
        import('apexcharts').then((ApexCharts) => {
          const gameNames = [...new Set(gameData.map((item: GameData) => item.name))];
          const gameLevels = [...new Set(gameData.map((item: GameData) => item.level))];

          const dataMatrix = gameLevels.map((level) => {
            return gameNames.map((game) => {
              const gameDataForLevel = gameData.find(
                (item) => item.name === game && item.level === level
              );
              return gameDataForLevel ? gameDataForLevel.attempts : 0;
            });
          });

          const gameChartOptions = {
            chart: {
              type: 'heatmap',
              height: '100%',
              width: '100%',
              toolbar: { show: false },
            },
            tooltip: {
              enabled: true,
              custom: function ({ seriesIndex, dataPointIndex, w }: ApexTooltip) {
                const data = w.config.series[seriesIndex].data[dataPointIndex] as ApexTooltipSeriesData;
                return `<div class="custom-tooltip">
                  <span>Level: ${data.level}</span><br/>
                  <span>Game: ${data.x}</span><br/>
                  <span>Attempts: ${data.attempts}</span>
                </div>`;
              },
              style: {
                fontSize: '12px',
              },
            },
            dataLabels: {
              enabled: false,
            },
            series: dataMatrix.map((data, idx) => ({
              name: gameLevels[idx],
              data: data.map((item, i) => ({
                x: gameNames[i],
                y: item,
                level: gameLevels[idx],
                attempts: item,
              })),
            })),
            xaxis: {
              categories: gameNames.map((word: unknown) => typeof word === 'string' ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : String(word)),
              title: {
                text: 'Games',
                style: {
                  fontSize: '16px',
                },
              },
              labels: {
                style: {
                  fontSize: '14px',
                  colors: '#333',
                },
              },
            },
            yaxis: {
              categories: gameLevels,
              title: {
                text: 'Levels',
                style: {
                  fontSize: '16px',
                },
              },
              labels: {
                style: {
                  fontSize: '12px',
                },
                show: false,
              },
            },
            colors: ['#4D6269', '#29353C', '#1F2B30', '#141B1F'],
            plotOptions: {
              heatmap: {
                colorScale: {
                  ranges: [
                    {
                      from: 0,
                      to: 1,
                      name: 'Low',
                      color: '#4D6269',
                    },
                    {
                      from: 1,
                      to: 5,
                      name: 'Medium',
                      color: '#29353C',
                    },
                    {
                      from: 5,
                      to: 10,
                      name: 'High',
                      color: '#1F2B30',
                    },
                    {
                      from: 10,
                      to: 20,
                      name: 'Very High',
                      color: '#141B1F',
                    },
                  ],
                },
              },
            },
            legend: {
              show: false,
            },
            responsive: [
              {
                breakpoint: 1024,
                options: {
                  chart: {
                    width: '77.5%',
                  },
                },
              },
              {
                breakpoint: 480,
                options: {
                  chart: {
                    width: '77.5%',
                  },
                },
              },
            ],
          };

          const gameChart = new ApexCharts.default(gameRef.current, gameChartOptions);
          gameChart.render();

          return () => gameChart.destroy();
        })
      }
    }
  }, [visibleState, isClient, userData, xpDistribution, gameData, levelAmount]);


  const handleLogout = () => {
    logout();
    setError(null);
    router.replace('/signin');
  };

  const capitalizeWords = (str: string | undefined) => {
    if (!str) return '';
    return str
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const response = await fetch('/api/initDb');
        const data = await response.json();

        if (response.ok) {
          console.log(data.message);
          setIsDbInitialized(true);
        } else {
          console.error(data.error);
          setError('Database initialization failed');
        }
      } catch (error) {
        console.error('Error initializing database:', error);
        setError('Failed to initialize database');
      }
    };

    initializeDatabase();
  }, []);

  const saveNotes = useCallback(async (newContent: any) => {
    if (!isDbInitialized) {
      setError('Database not initialized');
      return;
    }

    try {
      const response = await fetch('/api/saveNotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData?.login,
          notebookcontent: newContent,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save notes');
      }
    } catch (error) {
      setError('An error occurred while saving notes: ' + error);
    }
  }, [isDbInitialized]);

  const saveColor = useCallback(async (newColor: any) => {
    if (!isDbInitialized) {
      setError('Database not initialized');
      return;
    }

    try {
      const response = await fetch('/api/setColor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData?.login,
          color_id: newColor,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save color');
      }
    } catch (error) {
      setError('An error occurred while saving color: ' + error);
    }
  }, [isDbInitialized]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setNotebookContent(newContent);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const newTimeoutId = setTimeout(() => saveNotes(newContent), 5000);
    setTimeoutId(newTimeoutId);
  };

  useEffect(() => {
    setColor(colorMap[colorId] || 1);
  }, [colorId]);

  const getColorByValue = (value: number) => {
    switch (value) {
      case 2:
        return '#ff6347';
      case 3:
        return '#8a2be2';
      case 4:
        return '#32cd32';
      case 5:
        return '#ff4500';
      default:
        return '#008080';
    }
  };

  useEffect(() => {
    if (isClient) {
      switch (color) {
        case 2:
          document.body.style.background = 'linear-gradient(45deg, #ff6347 25%, #ff0000 50%, #7f0000 100%)';
          break;
        case 3:
          document.body.style.background = 'linear-gradient(45deg, #8a2be2 25%, #6a0dad 50%, #4b0082 100%)';
          break;
        case 4:
          document.body.style.background = 'linear-gradient(45deg, #32cd32 25%, #228b22 50%, #006400 100%)';
          break;
        case 5:
          document.body.style.background = 'linear-gradient(45deg, #ff4500 25%, #ff6347 50%, #b22222 100%)';
          break;
        default:
          document.body.style.background = 'linear-gradient(45deg, #00bdbd 25%, #008080 50%,rgb(0, 97, 97) 100%)';
          break;
      }
    }
  }, [color, isClient]);

  if (loading) return <p className={styles.loading}>Loading...</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <>
      {showSplash && <Windows98Splash />}
      <div className={styles.acontainers}>
        <div className={styles.chartcontainers}>
          {visibleState.container1 && (
            <div className={`${styles.container} ${fullscreenState.container1 ? styles.fullscreen : ''}`}>
              <div className={`${styles.bar}`}>
                <p>USER INFORMATION</p>
                <div className={styles.barIcons}>
                  <button onClick={() => toggleFullscreen('container1')} className={styles.svgButton} aria-label="Fullscreen Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 24 24" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M3 3H9V9H3zM3 15H9V21H3zM15 3H21V9H15zM15 15H21V21H15z" />
                    </svg>
                  </button>
                  <button onClick={() => toggleVisibility('container1')} className={styles.svgButton} aria-label="SVG Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 8 7" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M1 6V5h1V4h1V3h2v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1zm0-4V1H0V0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H2V2H1z" />
                    </svg>
                  </button>
                </div>
              </div>
              <h1 className={styles.title}>Hi {userData?.login}!</h1>
              <div className={styles.blackbar}></div>
              <div className={styles.card}>
                <div className={styles.cardBody}>
                  <p><strong>Username:</strong> {userData?.login}</p>
                  <p><strong>Name:</strong> {capitalizeWords(userData?.firstName || '') + ' ' + capitalizeWords(userData?.lastName || '')}</p>
                  <p><strong>Email:</strong> {userData?.email}</p>
                  <p><strong>Audit Ratio:</strong> {userData?.auditRatio}</p>
                  <p><strong>Total XP:</strong> {xpAmount/1000} Kilobytes</p>
                  <p><strong>Module Level:</strong> {levelAmount} </p>
                  <p><strong>Last Completed:</strong> {lastProject} </p>
                  {/* Logout Button */}
                </div>
              </div>
            </div>
          )}
          {visibleState.container2 && (
            <div className={`${styles.container} ${fullscreenState.container2 ? styles.fullscreen : ''}`}>
              <div className={styles.bar}>
                <p>NOTEBOOK</p>
                <div className={styles.barIcons}>
                  <button onClick={() => toggleFullscreen('container2')} className={styles.svgButton} aria-label="Fullscreen Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 24 24" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M3 3H9V9H3zM3 15H9V21H3zM15 3H21V9H15zM15 15H21V21H15z" />
                    </svg>
                  </button>
                  <button onClick={() => toggleVisibility('container2')} className={styles.svgButton} aria-label="SVG Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 8 7" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M1 6V5h1V4h1V3h2v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1zm0-4V1H0V0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H2V2H1z" />
                    </svg>
                  </button>
                </div>
              </div>
              <textarea
                className={styles.textarea}
                value={notebookContent}
                onChange={handleChange}
                placeholder="Write your notes here..."
              />
            </div>
          )}
        </div>
        <div className={styles.chartcontainers}>
          {/* Audit Ratio Bar Chart */}
          {visibleState.chartContainer1 && (
            <div className={`${styles.chartContainer} ${fullscreenState.chartContainer1 ? styles.fullscreen : ''}`}>
              <div ref={barChartRef}></div>
              <div className={styles.bar}>
                <p>AUDIT RATIO</p>
                <div className={styles.barIcons}>
                  <button onClick={() => toggleFullscreen('chartContainer1')} className={styles.svgButton} aria-label="Fullscreen Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 24 24" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M3 3H9V9H3zM3 15H9V21H3zM15 3H21V9H15zM15 15H21V21H15z" />
                    </svg>
                  </button>
                  <button onClick={() => toggleVisibility('chartContainer1')} className={styles.svgButton} aria-label="SVG Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 8 7" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M1 6V5h1V4h1V3h2v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1zm0-4V1H0V0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H2V2H1z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* XP Distribution Chart */}
          {visibleState.chartContainer2 && (
            <div className={`${styles.chartContainer} ${fullscreenState.chartContainer2 ? styles.fullscreen : ''}`} >
              <div ref={xpChartRef}></div>
              <div className={styles.bar}>
                <p>USER LEVELS ({totalUsers} USERS)</p>
                <div className={styles.barIcons}>
                  <button onClick={() => toggleFullscreen('chartContainer2')} className={styles.svgButton} aria-label="Fullscreen Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 24 24" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M3 3H9V9H3zM3 15H9V21H3zM15 3H21V9H15zM15 15H21V21H15z" />
                    </svg>
                  </button>
                  <button onClick={() => toggleVisibility('chartContainer2')} className={styles.svgButton} aria-label="SVG Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 8 7" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M1 6V5h1V4h1V3h2v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1zm0-4V1H0V0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H2V2H1z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={styles.chartcontainers}>
          {visibleState.chartContainer3 && (
            <div className={`${styles.chartContainer} ${fullscreenState.chartContainer3 ? styles.fullscreen : ''}`} >
              <div ref={gameRef}></div>
              <div className={styles.bar}>
                <p>GAME INFO</p>
                <div className={styles.barIcons}>
                  <button onClick={() => toggleFullscreen('chartContainer3')} className={styles.svgButton} aria-label="Fullscreen Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 24 24" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M3 3H9V9H3zM3 15H9V21H3zM15 3H21V9H15zM15 15H21V21H15z" />
                    </svg>
                  </button>
                  <button onClick={() => toggleVisibility('chartContainer3')} className={styles.svgButton} aria-label="SVG Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 8 7" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M1 6V5h1V4h1V3h2v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1zm0-4V1H0V0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H2V2H1z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          {visibleState.container3 && (
            <div className={`${styles.container} ${fullscreenState.container3 ? styles.fullscreen : ''}`}>
              <div className={styles.bar}>
                <p>MINESWEEPER</p>
                <div className={styles.barIcons}>
                  <button onClick={() => toggleFullscreen('container3')} className={styles.svgButton} aria-label="Fullscreen Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 24 24" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M3 3H9V9H3zM3 15H9V21H3zM15 3H21V9H15zM15 15H21V21H15z" />
                    </svg>
                  </button>
                  <button onClick={() => toggleVisibility('container3')} className={styles.svgButton} aria-label="SVG Button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 8 7" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                      <path d="M1 6V5h1V4h1V3h2v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1zm0-4V1H0V0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H2V2H1z" />
                    </svg>
                  </button>
                </div>
              </div>
              <Minesweeper />
            </div>
          )}
        </div>
        <div className={styles.windowbar}>
          <div className={styles.buttonContainer}>
            <button
              style={{ backgroundColor: visibleState.container1 ? '#888b8d' : '' }}
              className={styles.iconButton}
              onClick={() => toggleVisibility('container1')}>
              <FontAwesomeIcon icon={faUser} />
            </button>
            <button
              style={{ backgroundColor: visibleState.container2 ? '#888b8d' : '' }}
              className={styles.iconButton}
              onClick={() => toggleVisibility('container2')}>
              <FontAwesomeIcon icon={faNoteSticky} />
            </button>
            <button
              style={{ backgroundColor: visibleState.chartContainer1 ? '#888b8d' : '' }}
              className={styles.iconButton}
              onClick={() => toggleVisibility('chartContainer1')}>
              <FontAwesomeIcon icon={faBarChart} />
            </button>
            <button
              style={{ backgroundColor: visibleState.chartContainer2 ? '#888b8d' : '' }}
              className={styles.iconButton}
              onClick={() => toggleVisibility('chartContainer2')}>
              <FontAwesomeIcon icon={faChartLine} />
            </button>
            <button
              style={{ backgroundColor: visibleState.chartContainer3 ? '#888b8d' : '' }}
              className={styles.iconButton}
              onClick={() => toggleVisibility('chartContainer3')}>
              <FontAwesomeIcon icon={faTrophy} />
            </button>
            <button
              style={{ backgroundColor: visibleState.container3 ? '#888b8d' : '' }}
              className={styles.iconButton}
              onClick={() => toggleVisibility('container3')}>
              <FontAwesomeIcon icon={faGamepad} />
            </button>
            <button
              style={{ backgroundColor: visibleState.container4 ? '#888b8d' : '' }}
              className={styles.iconButton}
              onClick={() => toggleVisibility('container4')}>
              <FontAwesomeIcon icon={faPalette} />
            </button>
            <button
              style={{ backgroundColor: visibleState.container5 ? '#888b8d' : '' }}
              className={`${styles.iconButton} ${styles.hideOnTablet}`}
              onClick={() => toggleVisibility('container5')}
            >
              <FontAwesomeIcon icon={faGun} />
            </button>
            <button className={styles.iconButton} onClick={handleLogout}>
              <FontAwesomeIcon icon={faSignOut} />
            </button>
          </div>
        </div>
      </div>
      {visibleState.container4 && (
        <div className={`${styles.colorcontainer} ${fullscreenState.container4 ? styles.fullscreen : ''}`}>
          <div className={styles.bar}>
            <p>COLOR</p>
            <div className={styles.barIcons}>
              <button onClick={() => toggleVisibility('container4')} className={styles.svgButton} aria-label="SVG Button">
                <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 8 7" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                  <path d="M1 6V5h1V4h1V3h2v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1zm0-4V1H0V0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H2V2H1z" />
                </svg>
              </button>
            </div>
          </div>
          <div className={styles.colorPicker}>
            {Object.entries(colorMap).map(([id, colorValue]) => (
              <button
                key={id}
                className={styles.colorSquare}
                onClick={() => setColor(colorValue)}
                onClickCapture={() => saveColor(colorValue)}
                aria-label={`Change color to ${colorValue}`}
                style={{ backgroundColor: getColorByValue(colorValue) }}
              ></button>
            ))}
          </div>
        </div>
      )}
      {visibleState.container5 && (
        <div className={`${styles.sicontainer} ${fullscreenState.container5 ? styles.fullscreen : ''}`}>
          <div className={styles.bar}>
            <p>SPACE INVADERS</p>
            <div className={styles.barIcons}>
              <button onClick={() => toggleVisibility('container5')} className={styles.svgButton} aria-label="SVG Button">
                <svg xmlns="http://www.w3.org/2000/svg" width="8px" height="7px" viewBox="0 0 8 7" fillRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
                  <path d="M1 6V5h1V4h1V3h2v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1zm0-4V1H0V0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H2V2H1z" />
                </svg>
              </button>
            </div>
          </div>
          <SpaceInvaders />
        </div>
      )}
    </>
  );
}

import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

interface GraphProps {
    GetChart: 'BarChart' | 'XpChart' | 'HeatMap';
    userData?: { totalUp: number; totalDown: number } | null;
    xpDistribution?: Array<{ xp: number; count: number }>;
    gameData?: Array<{ name: string; level: number; attempts: number }>;
    levelAmount?: number;
    setTotalUsers?: (total: number) => void;
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

const Graph: React.FC<GraphProps> = ({
    GetChart,
    userData,
    xpDistribution,
    gameData,
    levelAmount,
    setTotalUsers,
}) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let chart: ApexCharts | null = null;

        const renderChart = () => {
            if (chart) chart.destroy();

            let chartOptions: ApexCharts.ApexOptions = {};

            switch (GetChart) {
                case 'BarChart': {
                    if (!userData) return;
                    chartOptions = {
                        chart: { type: 'bar', height: '100%', width: 600, toolbar: { show: false } },
                        series: [
                            {
                                name: 'Audit Ratio',
                                data: [
                                    { x: 'Done', y: userData.totalUp / 1000 },
                                    { x: 'Received', y: userData.totalDown / 1000, fillColor: '#FF3D3D' },
                                ],
                            },
                        ],
                        dataLabels: {
                            enabled: false,
                        },
                        plotOptions: {
                            bar: { horizontal: true, borderRadius: 4, barHeight: '70%' },
                        },
                        xaxis: {
                            labels: { show: false },
                            categories: ['Done', 'Received'],
                        },
                        yaxis: {
                            labels: { style: { fontWeight: 'bold' } },
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
                    break;
                }
                case 'XpChart': {
                    if (!xpDistribution || levelAmount === undefined) return;
                    chartOptions = {
                        chart: { type: 'bar', height: '100%', width: 600, toolbar: { show: false } },
                        series: [
                            {
                                name: 'Users',
                                data: xpDistribution.map((item) => ({
                                    x: item.xp.toString(),
                                    y: item.count,
                                    fillColor: item.xp.toString() === levelAmount.toString() ? '#4D6269' : '#29353C',
                                })),
                            },
                        ],
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
                                text: 'XP Levels',
                                style: {
                                    fontWeight: 'bold'
                                }
                            },
                            labels: {
                                show: false,
                            }
                        },
                        yaxis: {
                            title: {
                                text: 'Users',
                                style: {
                                    fontWeight: 'bold'
                                }
                            },
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

                    if (setTotalUsers) {
                        const totalUsers = xpDistribution.reduce((acc, item) => acc + item.count, 0);
                        setTotalUsers(totalUsers);
                    }
                    break;
                }
                case 'HeatMap': {
                    if (!gameData) return;
                    const gameNames = [...new Set(gameData.map((item) => item.name))];
                    const gameLevels = [...new Set(gameData.map((item) => item.level))];
                    const dataMatrix = gameLevels.map((level) =>
                        gameNames.map((game) =>
                            gameData.find((item) => item.name === game && item.level === level)?.attempts || 0
                        )
                    );

                    chartOptions = {
                        chart: { type: 'heatmap', height: '100%', width: '100%', toolbar: { show: false } },
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
                            name: gameLevels[idx].toString(),
                            data: data.map((value, i) => ({
                                x: gameNames[i],
                                y: value,
                                level: gameLevels[idx],
                                attempts: value,
                            })),
                        })),
                        xaxis: {
                            categories: gameNames.map((name) =>
                                typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : String(name)
                            ),
                        },
                        yaxis: { title: { text: 'Levels', style: { fontSize: '16px' } } },
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
                    break;
                }
                default:
                    console.error(`Unsupported chart type: ${GetChart}`);
                    return;
            }

            chart = new ApexCharts(chartRef.current, chartOptions);
            chart.render();
        };

        renderChart();

        return () => {
            if (chart) chart.destroy();
        };
    }, [GetChart, userData, xpDistribution, gameData, levelAmount, setTotalUsers]);

    // Ensure a valid ReactNode is returned
    return <div ref={chartRef}></div>;
};

export default Graph;

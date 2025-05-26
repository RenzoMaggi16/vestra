import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './Chart.css';

const PortfolioChart = ({ data, selectedAsset, timeFilter }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!data || !data.dates || !data.values || data.dates.length === 0) {
      return;
    }

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    // Filter data based on time filter
    let filteredDates = [...data.dates];
    let filteredValues = [...data.values];

    if (timeFilter === '1h') {
      // For demo, just take the last 24 points and pretend they're hourly
      filteredDates = filteredDates.slice(-24);
      filteredValues = filteredValues.slice(-24);
    } else if (timeFilter === '3h') {
      // For demo, take the last 36 points
      filteredDates = filteredDates.slice(-36);
      filteredValues = filteredValues.slice(-36);
    } else if (timeFilter === '1d') {
      // For demo, take the last 48 points
      filteredDates = filteredDates.slice(-48);
      filteredValues = filteredValues.slice(-48);
    } else if (timeFilter === '1w') {
      // For demo, take all points but sample every 4th one
      filteredDates = filteredDates.filter((_, i) => i % 4 === 0);
      filteredValues = filteredValues.filter((_, i) => i % 4 === 0);
    }
    // For 1m, use all data

    // Create gradient for the line
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(248, 227, 107, 0.5)');
    gradient.addColorStop(1, 'rgba(248, 227, 107, 0)');

    // Siempre mostrar el balance total del portafolio, ignorando el activo seleccionado
    const chartLabel = 'Balance Total del Portafolio';
    
    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: filteredDates,
        datasets: [
          {
            label: chartLabel,
            data: filteredValues,
            borderColor: '#f8e36b',
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#f8e36b',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#111',
            titleColor: '#f8e36b',
            bodyColor: '#fff',
            borderColor: '#333',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `$${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              display: false
            }
          },
          y: {
            grid: {
              color: '#222',
              drawBorder: false
            },
            ticks: {
              color: '#888',
              padding: 10,
              callback: function(value) {
                return value >= 1000 ? `${value/1000}k` : value;
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, selectedAsset, timeFilter]);

  return (
    <div className="chart-wrapper">
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default PortfolioChart;
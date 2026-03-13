// Prediction functionality
let predictionChart = null; // Global variable to store chart instance

document.addEventListener('DOMContentLoaded', function() {
    // Auto-fill sample data on page load for demo
    useSampleData();
});

function useSampleData() {
    // Fill form with sample data
    document.getElementById('eur').value = '0.85';
    document.getElementById('gbp').value = '0.73';
    document.getElementById('jpy').value = '148.50';
    document.getElementById('cad').value = '1.37';
}

function makePrediction() {
    const form = document.getElementById('predictionForm');
    const formData = new FormData(form);
    const data = {};
    
    // Convert form data to object
    for (let [key, value] of formData.entries()) {
        if (value) {
            data[key] = parseFloat(value);
        }
    }
    
    // Show loading spinner
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('predictionResults').style.display = 'none';
    
    // Make API call
    fetch('/api/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.error) {
            throw new Error(result.error);
        }
        displayPredictionResults(result);
    })
    .catch(error => {
        console.error('Prediction error:', error);
        showAlert('Error making prediction: ' + error.message, 'danger');
    })
    .finally(() => {
        document.getElementById('loadingSpinner').style.display = 'none';
    });
}

function displayPredictionResults(result) {
    // Update result values
    document.getElementById('predictedPrice').textContent = formatCurrency(result.prediction);
    document.getElementById('confidenceLower').textContent = formatCurrency(result.confidence_lower);
    document.getElementById('confidenceUpper').textContent = formatCurrency(result.confidence_upper);
    document.getElementById('modelAlgorithm').textContent = result.model;
    document.getElementById('predictionTime').textContent = new Date(result.timestamp).toLocaleTimeString();
    
    // Show results
    document.getElementById('predictionResults').style.display = 'block';
    
    // Create prediction chart
    createPredictionChart(result);
    
    // Scroll to results
    document.getElementById('predictionResults').scrollIntoView({ 
        behavior: 'smooth' 
    });
    
    showAlert('Prediction completed successfully!', 'success');
}

function createPredictionChart(result) {
    const ctx = document.getElementById('predictionChart');
    if (!ctx) {
        console.error('Cannot find prediction chart canvas');
        return;
    }

    // Destroy existing chart if it exists
    if (predictionChart) {
        predictionChart.destroy();
    }

    // Create gradient for bars
    const ctx2d = ctx.getContext('2d');
    const gradientLower = ctx2d.createLinearGradient(0, 0, 0, 400);
    gradientLower.addColorStop(0, 'rgba(220, 53, 69, 0.8)');
    gradientLower.addColorStop(1, 'rgba(220, 53, 69, 0.3)');

    const gradientPredicted = ctx2d.createLinearGradient(0, 0, 0, 400);
    gradientPredicted.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    gradientPredicted.addColorStop(1, 'rgba(255, 215, 0, 0.3)');

    const gradientUpper = ctx2d.createLinearGradient(0, 0, 0, 400);
    gradientUpper.addColorStop(0, 'rgba(40, 167, 69, 0.8)');
    gradientUpper.addColorStop(1, 'rgba(40, 167, 69, 0.3)');
    
    const data = {
        labels: ['Lower Bound', 'Predicted Price', 'Upper Bound'],
        datasets: [{
            label: 'Price Range (USD)',
            data: [result.confidence_lower, result.prediction, result.confidence_upper],
            backgroundColor: [gradientLower, gradientPredicted, gradientUpper],
            borderColor: [
                'rgba(220, 53, 69, 1)',
                'rgba(255, 215, 0, 1)',
                'rgba(40, 167, 69, 1)'
            ],
            borderWidth: 2,
            barPercentage: 0.7
        }]
    };
    
    predictionChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Prediction Range Visualization',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Form validation
document.getElementById('predictionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    makePrediction();
});

// Real-time form validation
document.querySelectorAll('#predictionForm input').forEach(input => {
    input.addEventListener('input', function() {
        validateInput(this);
    });
});

function validateInput(input) {
    const value = parseFloat(input.value);
    
    if (input.value && (isNaN(value) || value <= 0)) {
        input.classList.add('is-invalid');
        return false;
    } else {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        return true;
    }
}

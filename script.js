document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables & Constants ---
    let currentWeatherData = null;
    let isCelsius = true;
    let favourites = JSON.parse(localStorage.getItem('weatherFavourites')) || [];
    
    // --- DOM Element References ---
    const searchButton = document.getElementById('searchButton');
    const locationInput = document.getElementById('locationInput');
    const currentLocationButton = document.getElementById('currentLocationButton');
    const toggleTempButton = document.getElementById('toggleTempButton');
    const addFavouriteButton = document.getElementById('addFavouriteButton');
    const tomorrowForecastBtn = document.getElementById('tomorrowForecastBtn');
    const weekForecastBtn = document.getElementById('weekForecastBtn');
    
    const loadingDiv = document.getElementById('loading');
    const weatherContentDiv = document.getElementById('weatherContent');
    const errorDiv = document.getElementById('error');
    const favouritesListDiv = document.getElementById('favouritesList');
    const forecastDisplayDiv = document.getElementById('forecastDisplay');

    // --- Core Data Fetching Functions ---

    /**
     * Fetches weather data for a given location string (city, postcode, or lat,lon).
     * @param {string} locationQuery - The location search term.
     */
    const getWeatherData = async (locationQuery) => {
        showLoading();
        forecastDisplayDiv.innerHTML = '';
        try {
            // WeatherAPI.com can handle forecast and current in one call,
            // so we always fetch the forecast data.
            const response = await fetch(`/.netlify/functions/get-weather?type=forecast&location=${locationQuery}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            handleSuccessfulWeatherFetch(data);
        } catch (error) {
            console.error('Error fetching weather data:', error);
            showError('Could not find weather data for that location.');
        }
    };
    
    /**
     * Handles the successful fetch of weather data.
     * @param {object} data - The full forecast data from the API.
     */
    const handleSuccessfulWeatherFetch = (data) => {
        currentWeatherData = data;
        isCelsius = true; // Default to Celsius on new data fetch
        updateWeatherDisplay();
        updateVisuals(data.current.condition);
        showWeather();
    };

    // --- UI Update Functions ---

    /**
     * Updates the main weather display with current data.
     */
    const updateWeatherDisplay = () => {
        if (!currentWeatherData) return;

        const { location, current } = currentWeatherData;
        const tempCelsius = current.temp_c;
        const tempFahrenheit = current.temp_f;

        document.getElementById('locationName').textContent = location.name;
        document.getElementById('weatherDescription').textContent = current.condition.text;
        document.getElementById('weatherIcon').src = `https:${current.condition.icon}`; // Icon URL already includes protocol
        document.getElementById('weatherIcon').alt = current.condition.text;
        
        if (isCelsius) {
            document.getElementById('temperature').innerHTML = `${Math.round(tempCelsius)}&deg;C`;
            toggleTempButton.textContent = 'Switch to Fahrenheit';
        } else {
            document.getElementById('temperature').innerHTML = `${Math.round(tempFahrenheit)}&deg;F`;
            toggleTempButton.textContent = 'Switch to Celsius';
        }
    };
    
/**
     * Updates the background image and favicon based on the weather condition code.
     * @param {object} condition - The condition object from the API response.
     */
    const updateVisuals = (condition) => {
        const code = condition.code;
        const body = document.body;
        const favicon = document.getElementById('favicon');
        body.className = ''; // Reset classes

        // Mapping codes from https://www.weatherapi.com/docs/weather_conditions.json
        if (code === 1000) { // Clear / Sunny
            body.classList.add('weather-clear');
            favicon.href = 'assets/icon-clear.png';
        } else if (code === 1003) { // Partly cloudy
            body.classList.add('weather-clouds');
            favicon.href = 'assets/icon-clouds.png';
        } else if ([1006, 1009].includes(code)) { // Cloudy, Overcast
            body.classList.add('weather-clouds');
            favicon.href = 'assets/icon-clouds.png';
        } else if ([1030, 1135, 1147].includes(code)) { // Mist, Fog, Freezing fog
            body.classList.add('weather-atmosphere');
            favicon.href = 'assets/icon-atmosphere.png';
        } else if ([1063, 1150, 1153, 1180, 1183, 1240, 1273].includes(code)) { // Patchy light rain, Drizzle, Light rain shower, Light rain, Light shower, Light thunder
            body.classList.add('weather-rain');
            favicon.href = 'assets/icon-rain.png';
        } else if ([1069, 1168, 1171, 1186, 1189, 1192, 1195, 1243, 1246, 1276].includes(code)) { // Patchy sleet, Freezing drizzle, Heavy freezing drizzle, Moderate rain, Heavy rain, Heavy shower, Heavy thunder
            body.classList.add('weather-rain');
            favicon.href = 'assets/icon-rain.png';
        } else if ([1066, 1114, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258, 1279, 1282].includes(code)) { // Patchy snow, Blowing snow, Light snow, Moderate snow, Heavy snow, Ice pellets, etc.
            body.classList.add('weather-snow');
            favicon.href = 'assets/icon-snow.png';
        } else { // Default
            body.classList.add('weather-clear');
            favicon.href = 'assets/icon-clear.png';
        }
    };
    
    /**
     * Displays the forecast for tomorrow.
     */
    const displayTomorrowForecast = () => {
        if (!currentWeatherData || !currentWeatherData.forecast.forecastday[1]) return;
        
        const tomorrow = currentWeatherData.forecast.forecastday[1]; // Index 1 is tomorrow

        forecastDisplayDiv.innerHTML = `
            <h4 class="text-center mt-4 mb-3">Tomorrow's Forecast</h4>
            <div class="row justify-content-center">
                <div class="col-md-4">
                    ${createForecastCard(tomorrow)}
                </div>
            </div>
        `;
    };

    /**
     * Displays the forecast for the next week.
     */
    const displayWeekForecast = () => {
        if (!currentWeatherData) return;

        const dailyForecasts = currentWeatherData.forecast.forecastday;

        let forecastHtml = '<h4 class="text-center mt-4 mb-3">7-Day Forecast</h4><div class="row g-2 justify-content-center">';
        dailyForecasts.forEach(forecast => {
            forecastHtml += `<div class="col-lg col-md-4 col-sm-6">${createForecastCard(forecast)}</div>`;
        });
        forecastHtml += '</div>';

        forecastDisplayDiv.innerHTML = forecastHtml;
    };
    
    /**
     * Creates the HTML for a single forecast card.
     * @param {object} forecastDay - A forecastday object from the API list.
     * @returns {string} - HTML string for the card.
     */
    const createForecastCard = (forecastDay) => {
        const date = new Date(forecastDay.date);
        const day = date.toLocaleDateString('en-GB', { weekday: 'short' });
        const temp = Math.round(forecastDay.day.avgtemp_c);
        const icon = `https:${forecastDay.day.condition.icon}`;
        const desc = forecastDay.day.condition.text;
        
        return `
            <div class="forecast-card">
                <h5>${day}</h5>
                <img src="${icon}" alt="${desc}">
                <p class="mb-0 fw-bold">${temp}&deg;C</p>
                <p class="mb-0 text-capitalize small">${desc}</p>
            </div>
        `;
    };

    // --- UI State Management ---
    const showLoading = () => {
        loadingDiv.classList.remove('d-none');
        weatherContentDiv.classList.add('d-none');
        errorDiv.classList.add('d-none');
    };

    const showWeather = () => {
        loadingDiv.classList.add('d-none');
        weatherContentDiv.classList.remove('d-none');
        errorDiv.classList.add('d-none');
    };

    const showError = (message) => {
        loadingDiv.classList.add('d-none');
        weatherContentDiv.classList.add('d-none');
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
    };
    
    // --- Favourites Management ---
    const updateFavouritesList = () => {
        favouritesListDiv.innerHTML = '';
        if (favourites.length === 0) {
            favouritesListDiv.innerHTML = '<p class="text-white-50">No favourite locations saved yet.</p>';
            return;
        }
        favourites.forEach(fav => {
            const favEl = document.createElement('div');
            favEl.className = 'badge bg-primary p-2 favourite-item';
            favEl.textContent = fav;
            favEl.setAttribute('data-city', fav);
            
            const removeIcon = document.createElement('i');
            removeIcon.className = 'fas fa-times-circle remove-fav';
            removeIcon.setAttribute('data-city', fav);
            
            favEl.appendChild(removeIcon);
            favouritesListDiv.appendChild(favEl);
        });
    };

    const saveFavourites = () => {
        localStorage.setItem('weatherFavourites', JSON.stringify(favourites));
    };

    const addFavourite = () => {
        if (!currentWeatherData) return;
        const locationName = currentWeatherData.location.name;
        if (locationName && !favourites.includes(locationName)) {
            favourites.push(locationName);
            saveFavourites();
            updateFavouritesList();
        }
    };
    
    const removeFavourite = (city) => {
        favourites = favourites.filter(fav => fav !== city);
        saveFavourites();
        updateFavouritesList();
    };


    // --- Event Handlers ---
    const handleSearch = () => {
        const location = locationInput.value.trim();
        if (location) {
            getWeatherData(location);
            locationInput.value = '';
        }
    };
    
    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    getWeatherData(`${latitude},${longitude}`);
                },
                error => {
                    console.error('Error getting location:', error);
                    showError('Unable to retrieve your location. Please grant permission or use the search bar.');
                }
            );
        } else {
            showError('Geolocation is not supported by your browser.');
        }
    };
    
    const handleToggleTemp = () => {
        isCelsius = !isCelsius;
        updateWeatherDisplay();
    };

    const handleFavouritesClick = (e) => {
        const target = e.target;
        if (target.classList.contains('remove-fav')) {
            e.stopPropagation();
            const city = target.getAttribute('data-city');
            removeFavourite(city);
        } else if (target.classList.contains('favourite-item')) {
            const city = target.getAttribute('data-city');
            getWeatherData(city);
        }
    };
    
    // --- Event Listeners ---
    searchButton.addEventListener('click', handleSearch);
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    currentLocationButton.addEventListener('click', handleGetCurrentLocation);
    toggleTempButton.addEventListener('click', handleToggleTemp);
    addFavouriteButton.addEventListener('click', addFavourite);
    favouritesListDiv.addEventListener('click', handleFavouritesClick);
    tomorrowForecastBtn.addEventListener('click', displayTomorrowForecast);
    weekForecastBtn.addEventListener('click', displayWeekForecast);
    
    // --- Initialisation ---
    const initialiseApp = () => {
        updateFavouritesList();
        handleGetCurrentLocation(); 
    };

    initialiseApp();
});
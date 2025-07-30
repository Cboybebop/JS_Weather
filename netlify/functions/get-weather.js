// netlify/functions/get-weather.js

const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    // Get the API key from the environment variables
    const apiKey = process.env.WEATHERAPI_API_KEY; 
    const baseUrl = 'https://api.weatherapi.com/v1/';

    // Get parameters from the front-end's request
    const { location, type } = event.queryStringParameters;

    let apiUrl;

    if (!location) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing location parameter.' }),
        };
    }

    if (type === 'forecast') {
        // WeatherAPI combines current and forecast data in one call
        // We will request 7 days for the weekly forecast
        apiUrl = `${baseUrl}forecast.json?key=${apiKey}&q=${location}&days=7&aqi=no&alerts=no`;
    } else { // Current weather request
        apiUrl = `${baseUrl}current.json?key=${apiKey}&q=${location}&aqi=no`;
    }
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok || data.error) {
           return { statusCode: response.status, body: JSON.stringify(data.error) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch weather data.' }),
        };
    }
};
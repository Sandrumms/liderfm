document.addEventListener('DOMContentLoaded', function() {
    // Player de Rádio (sem alterações)
    const audioPlayer = document.getElementById('radioStream');
    const playIcon = document.getElementById('playIcon');
    const playText = document.getElementById('playText');
    const volumeSlider = document.getElementById('volumeSlider');

    audioPlayer.volume = 0.7;
    volumeSlider.value = 0.7;

    window.togglePlay = function() {
        if (audioPlayer.paused) {
            audioPlayer.play().catch(e => console.error("Erro ao reproduzir:", e));
            playIcon.className = 'fas fa-pause';
            playText.textContent = 'Pausar';
        } else {
            audioPlayer.pause();
            playIcon.className = 'fas fa-play';
            playText.textContent = 'Ouvir';
        }
    };

    window.adjustVolume = function(change) {
        let volume = audioPlayer.volume + change;
        volume = Math.max(0, Math.min(1, volume));
        audioPlayer.volume = volume;
        volumeSlider.value = volume;
    };

    volumeSlider.addEventListener('input', function() {
        audioPlayer.volume = this.value;
    });

    // Previsão do Tempo com Open-Meteo (Corrigido e Maximizado)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=-22.7752&longitude=-41.9134&daily=sunrise,temperature_2m_max,temperature_2m_min,daylight_duration,wind_speed_10m_max&hourly=temperature_2m,relative_humidity_2m,rain,precipitation_probability,apparent_temperature,wind_speed_10m&current=temperature_2m,precipitation,rain,relative_humidity_2m,is_day,apparent_temperature`;

    fetch(weatherUrl)
        .then(response => {
            console.log('Resposta da API:', response); // Log pra verificar a resposta
            if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('Dados recebidos:', data); // Log pra ver os dados

            // Dados atuais
            const temp = Math.round(data.current.temperature_2m);
            const feelsLike = Math.round(data.current.apparent_temperature);
            const humidity = data.current.relative_humidity_2m;
            const wind = Math.round(data.hourly.wind_speed_10m[0]); // Primeiro valor horário
            const windDir = data.hourly.wind_speed_10m[0] ? 'N/A' : 'N/A'; // Sem direção na API, placeholder
            const rain = data.current.rain;
            const precipProb = data.hourly.precipitation_probability[0];
            const isDay = data.current.is_day === 1 ? 'Dia' : 'Noite';
            const weatherCode = inferWeatherCode(rain, precipProb);

            document.querySelector('.temp').textContent = `${temp}°C`;
            document.querySelector('.condition').textContent = `${weatherCodeToDescription(weatherCode)} (${isDay})`;
            document.querySelector('.feels-like').textContent = `${feelsLike}°C`;
            document.querySelector('.humidity').textContent = `${humidity}%`;
            document.querySelector('.wind').textContent = `${wind} km/h`;
            document.querySelector('.wind-direction').textContent = `${windDir}`;
            document.querySelector('.rain').textContent = `${rain} mm`;
            document.querySelector('.uv-index').textContent = `${precipProb}%`; // Proxy pra prob. de chuva
            document.querySelector('.weather-icon i').className = `wi ${weatherCodeToIcon(weatherCode)}`;

            // Fundo dinâmico com imagens
            const weatherCurrent = document.querySelector('.weather-current');
            if (rain > 0) {
                weatherCurrent.style.backgroundImage = `url('https://images.unsplash.com/photo-1519692933481-e162a57d6721')`; // Chuva
            } else if (temp < 20) {
                weatherCurrent.style.backgroundImage = `url('https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0')`; // Frio
            } else if (temp >= 20 && temp <= 25) {
                weatherCurrent.style.backgroundImage = `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e')`; // Moderado
            } else {
                weatherCurrent.style.backgroundImage = `url('https://images.unsplash.com/photo-1498550744921-75f79806b8a7')`; // Quente
            }

            // Dados diários
            const sunrise = new Date(data.daily.sunrise[0]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const daylight = Math.round(data.daily.daylight_duration[0] / 3600);
            const tempMax = Math.round(data.daily.temperature_2m_max[0]);
            const tempMin = Math.round(data.daily.temperature_2m_min[0]);
            const windMax = Math.round(data.daily.wind_speed_10m_max[0]);

            document.querySelector('.sunrise').textContent = sunrise;
            document.querySelector('.daylight').textContent = `${daylight}h`;
            document.querySelector('.temp-range').textContent = `${tempMax}° / ${tempMin}° (Vento máx: ${windMax} km/h)`;

            // Previsão horária (8 horas)
            const forecastContainer = document.querySelector('.forecast-container');
            forecastContainer.innerHTML = '';
            for (let i = 0; i < 8; i++) {
                const time = new Date(data.hourly.time[i]);
                const hour = time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const temp = Math.round(data.hourly.temperature_2m[i]);
                const feelsLikeHour = Math.round(data.hourly.apparent_temperature[i]);
                const precipProbHour = data.hourly.precipitation_probability[i];
                const code = inferWeatherCode(data.hourly.rain[i], precipProbHour);

                const forecastItem = document.createElement('div');
                forecastItem.className = 'forecast-item';
                forecastItem.innerHTML = `
                    <div class="day">${hour}</div>
                    <i class="wi ${weatherCodeToIcon(code)}"></i>
                    <div class="temps">${temp}° (${feelsLikeHour}°)</div>
                    <div class="precip-prob">${precipProbHour}% chuva</div>
                `;
                forecastContainer.appendChild(forecastItem);
            }
        })
        .catch(e => {
            console.error("Erro ao carregar clima:", e.message);
            document.querySelector('.temp').textContent = 'Erro';
            document.querySelector('.condition').textContent = e.message;
        });

    // Funções de conversão
    function inferWeatherCode(rain, precipProb) {
        if (rain > 5) return 65;
        if (rain > 2) return 63;
        if (rain > 0) return 61;
        if (precipProb > 70) return 80;
        if (precipProb > 30) return 3;
        return 0;
    }

    function weatherCodeToDescription(code) {
        const weatherCodes = {
            0: 'Céu limpo',
            3: 'Nublado',
            61: 'Chuva leve',
            63: 'Chuva moderada',
            65: 'Chuva forte',
            80: 'Pancadas de chuva'
        };
        return weatherCodes[code] || 'Desconhecido';
    }

    function weatherCodeToIcon(code) {
        const iconMap = {
            0: 'wi-day-sunny',
            3: 'wi-cloudy',
            61: 'wi-rain-mix',
            63: 'wi-rain',
            65: 'wi-rain-wind',
            80: 'wi-showers'
        };
        return iconMap[code] || 'wi-day-sunny';
    }

    // Carrossel de Anunciantes (sem alterações)
    const carousel = document.querySelector('.carousel-items');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    const items = document.querySelectorAll('.carousel-item');
    let currentIndex = 0;
    const itemWidth = items[0].offsetWidth + 16;

    function updateCarousel() {
        carousel.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
    }

    nextBtn.addEventListener('click', () => {
        if (currentIndex < items.length - 1) {
            currentIndex++;
            updateCarousel();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    });

    setInterval(() => {
        if (currentIndex < items.length - 1) {
            currentIndex++;
        } else {
            currentIndex = 0;
        }
        updateCarousel();
    }, 5000);

    // Função Ver Mais Câmeras (sem alterações)
    window.toggleCameras = function() {
        const hiddenCameras = document.querySelectorAll('.hidden-mobile');
        hiddenCameras.forEach(camera => {
            camera.style.display = camera.style.display === 'block' ? 'none' : 'block';
        });
        const button = document.querySelector('.toggle-cameras');
        button.textContent = button.textContent === 'Ver Mais' ? 'Ver Menos' : 'Ver Mais';
    };

    // Animações de entrada (sem alterações)
    const sections = document.querySelectorAll('.animate');
    sections.forEach((section, index) => {
        section.style.animationDelay = `${index * 0.2}s`;
    });
});
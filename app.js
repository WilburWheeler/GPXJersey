const sheetDbUrl = "https://sheetdb.io/api/v1/3rcd2azl3nvuo"; // Replace this!

const allRoutes = [
  {
    "id": 1,
    "name": "Jersey Inland",
    "type": "Road Cycling",
    "distance": 64.4,
    "elevation": 541,
    "likes": 0, // Will be overwritten by SheetDB
    "lat": 49.19364,
    "lon": -2.12765,
    "gpxFile": "Jersey inland.gpx"
  },
  {
    "id": 2,
    "name": "Lap of Jersey",
    "type": "Road Cycling",
    "distance": 68.9,
    "elevation": 656,
    "likes": 0, // Will be overwritten by SheetDB
    "lat": 49.19398,
    "lon": -2.12872,
    "gpxFile": "Lap of Jersey.gpx"
  }
];

let userLat = null, userLon = null;

document.addEventListener('DOMContentLoaded', async () => {
    await syncLikesFromSheet();
    renderRoutes(allRoutes);
    
    document.getElementById('searchInput').addEventListener('input', filterAndSort);
    document.getElementById('filterType').addEventListener('change', filterAndSort);
    document.getElementById('filterDifficulty').addEventListener('change', filterAndSort);
    document.getElementById('sortBy').addEventListener('change', filterAndSort);
});

async function syncLikesFromSheet() {
    try {
        const response = await fetch(sheetDbUrl);
        const data = await response.json();
        data.forEach(row => {
            const route = allRoutes.find(r => r.id == row.id);
            if (route) route.likes = parseInt(row.likes) || 0;
        });
    } catch (e) { console.error("Database sync failed."); }
}

function getDifficulty(dist, ele) {
    if (ele > 600 || dist > 60) return "Hard";
    if (ele > 300) return "Moderate";
    return "Easy";
}

function renderRoutes(routes) {
    const grid = document.getElementById('routesGrid');
    grid.innerHTML = '';

    routes.forEach(route => {
        const diff = getDifficulty(route.distance, route.elevation);
        const hasLiked = localStorage.getItem(`hasLiked-${route.id}`) === 'true';
        
        const card = document.createElement('div');
        card.className = 'route-card';
        card.innerHTML = `
            <div id="map-${route.id}" class="map-preview"></div>
            <h3>${route.name}</h3>
            <div class="route-stats">
                <div>
                    <span class="tag" style="background:var(--primary-green)">${route.type}</span>
                    <span class="tag ${diff.toLowerCase()}">${diff}</span>
                </div>
                <button class="like-btn" id="like-btn-${route.id}" 
                        onclick="addLike(${route.id})" 
                        ${hasLiked ? 'disabled' : ''}>
                    ❤️ <span id="like-count-${route.id}">${route.likes}</span>
                </button>
            </div>
            <p>📏 ${route.distance}km | ⛰️ ${route.elevation}m</p>
            <a href="${route.gpxFile}" class="download-btn" download="${route.name}.gpx">Download GPX</a>
        `;
        grid.appendChild(card);

        // Render Red Route Line
        const map = L.map(`map-${route.id}`, {zoomControl: false, attributionControl: false});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        new L.GPX(route.gpxFile, {
            async: true,
            polyline_options: { color: 'red', opacity: 0.8, weight: 4 },
            marker_options: { startIconUrl: null, endIconUrl: null, shadowUrl: null }
        }).on('loaded', function(e) {
            map.fitBounds(e.target.getBounds());
        }).addTo(map);
    });
}

async function addLike(id) {
    if (localStorage.getItem(`hasLiked-${id}`) === 'true') return;
    
    const route = allRoutes.find(r => r.id === id);
    route.likes++;

    document.getElementById(`like-count-${id}`).innerText = route.likes;
    localStorage.setItem(`hasLiked-${id}`, 'true');
    
    const btn = document.getElementById(`like-btn-${id}`);
    btn.disabled = true;

    try {
        await fetch(`${sheetDbUrl}/id/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "likes": route.likes })
        });
    } catch (e) { console.error("SheetDB update failed."); }
}

function filterAndSort() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('filterType').value;
    const diffFilter = document.getElementById('filterDifficulty').value;
    const sortBy = document.getElementById('sortBy').value;

    let processed = allRoutes.filter(r => {
        const matchesName = r.name.toLowerCase().includes(searchTerm);
        const matchesType = typeFilter === 'all' || r.type === typeFilter;
        const matchesDiff = diffFilter === 'all' || getDifficulty(r.distance, r.elevation) === diffFilter;
        return matchesName && matchesType && matchesDiff;
    });

    if (sortBy === 'likes') processed.sort((a,b) => b.likes - a.likes);
    else if (sortBy === 'distance') processed.sort((a,b) => a.distance - b.distance);
    else if (sortBy === 'nearMe' && userLat) {
        processed.sort((a,b) => calculateDistance(userLat, userLon, a.lat, a.lon) - calculateDistance(userLat, userLon, b.lat, b.lon));
    }

    renderRoutes(processed);
}

function getUserLocation() {
    const status = document.getElementById('locationStatus');
    navigator.geolocation.getCurrentPosition((pos) => {
        userLat = pos.coords.latitude;
        userLon = pos.coords.longitude;
        status.textContent = "Location found! Sorting...";
        document.getElementById('sortBy').value = 'nearMe';
        filterAndSort();
    }, () => { status.textContent = "Location access denied."; });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function openUploadModal() { document.getElementById('uploadModal').style.display = 'block'; }
function closeUploadModal() { document.getElementById('uploadModal').style.display = 'none'; }

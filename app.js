
const allRoutes = [
  {
    "id": 1,
    "name": "Jersey Inland",
    "type": "Cycling",
    "distance": 64.4,
    "elevation": 541,
    "likes": parseInt(localStorage.getItem('likes-1')) || 0,
    "lat": 49.19364,
    "lon": -2.12765,
    "gpxFile": "Jersey inland.gpx"
  },
  {
    "id": 2,
    "name": "Lap of Jersey",
    "type": "Cycling",
    "distance": 68.9,
    "elevation": 656,
    "likes": parseInt(localStorage.getItem('likes-2')) || 0,
    "lat": 49.19398,
    "lon": -2.12872,
    "gpxFile": "Lap of Jersey.gpx"
  }
];

let userLat = null, userLon = null;

document.addEventListener('DOMContentLoaded', () => {
    renderRoutes(allRoutes);
    document.getElementById('searchInput').addEventListener('input', filterAndSort);
    document.getElementById('filterType').addEventListener('change', filterAndSort);
    document.getElementById('filterDifficulty').addEventListener('change', filterAndSort);
    document.getElementById('sortBy').addEventListener('change', filterAndSort);
});

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
                    <span class="tag" style="background:#2E8B57">${route.type}</span>
                    <span class="tag ${diff.toLowerCase()}">${diff}</span>
                </div>
                <button class="like-btn" id="like-btn-${route.id}" 
                        onclick="addLike(${route.id})" 
                        ${hasLiked ? 'disabled style="opacity: 0.5; cursor: default;"' : ''}>
                    ❤️ <span id="like-count-${route.id}">${route.likes}</span>
                </button>
            </div>
            <p>📏 ${route.distance}km | ⛰️ ${route.elevation}m</p>
            // Make sure your link in app.js looks like this:
            <a href="${route.gpxFile}" class="download-btn" download="${route.name}.gpx">Download GPX</a>
        `;
        grid.appendChild(card);

        // Render the Full Route in Red
        const map = L.map(`map-${route.id}`, {
            zoomControl: false, 
            attributionControl: false,
            dragging: false, // Static feel for cards
            scrollWheelZoom: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // This plugin loads the file and draws the red line
        new L.GPX(route.gpxFile, {
            async: true,
            polyline_options: {
                color: 'red',
                opacity: 0.75,
                weight: 3,
                lineCap: 'round'
            },
            marker_options: {
                startIconUrl: null, // Hide start/end icons to keep it clean
                endIconUrl: null,
                shadowUrl: null
            }
        }).on('loaded', function(e) {
            map.fitBounds(e.target.getBounds()); // Automatically zooms map to show whole route
        }).addTo(map);
    });
}

function addLike(id) {
    // Check if already liked to prevent manual console spamming
    if (localStorage.getItem(`hasLiked-${id}`) === 'true') return;

    const route = allRoutes.find(r => r.id === id);
    route.likes++;
    
    // Save the new count and the "voted" status
    localStorage.setItem(`likes-${id}`, route.likes);
    localStorage.setItem(`hasLiked-${id}`, 'true');

    // Update UI
    document.getElementById(`like-count-${id}`).innerText = route.likes;
    const btn = document.getElementById(`like-btn-${id}`);
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "default";
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
    // ... add nearMe logic if needed ...

    renderRoutes(processed);
}

}
const sheetDbUrl = "https://docs.google.com/spreadsheets/d/1PbXrT5YcwL9xg6KFvbJxswbtIM4sBRX3XW0587657pI/edit?gid=0#gid=0";

async function syncLikesFromSheet() {
    try {
        const response = await fetch(sheetDbUrl);
        const data = await response.json();
        
        data.forEach(row => {
            const route = allRoutes.find(r => r.id == row.id);
            if (route) route.likes = parseInt(row.likes);
        });
    } catch (e) {
        console.error("SheetDB sync failed.");
    }
}
async function addLike(id) {
    if (localStorage.getItem(`hasLiked-${id}`) === 'true') return;
    const route = allRoutes.find(r => r.id === id);
    route.likes++;

    document.getElementById(`like-count-${id}`).innerText = route.likes;
    localStorage.setItem(`hasLiked-${id}`, 'true');

    // SheetDB Update
    try {
        await fetch(`${sheetDbUrl}/id/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "likes": route.likes })
        });
    } catch (e) {
        console.error("Failed to update SheetDB");
    }

    const btn = document.getElementById(`like-btn-${id}`);
    btn.disabled = true;
    btn.style.opacity = "0.5";
}

# Interactive Bangladesh Administrative Boundary Map

This project is an **interactive map application** displaying administrative boundaries of Bangladesh across multiple zoom levels.  
It uses **Leaflet.js** for map rendering and GeoJSON datasets for boundary data.  
A Node.js server handles static file hosting.

**Live Demo:** [http://maps.zednzedit.com/](http://maps.zednzedit.com/)

---

## 📂 Project Structure

├── .gitignore
├── Assests
└── images
│ └── logo.png
├── README.md
├── data
├── level1.geojson
├── level2.geojson
├── level3.geojson
├── level4.geojson
└── level5.geojson
├── index.html
├── package-lock.json
├── package.json
├── script.js
├── server.js
└── style.css

## 🚀 Tech Stack

- **Frontend:**

  - HTML5
  - CSS3
  - JavaScript (ES6)
  - [Leaflet.js](https://leafletjs.com/) for map rendering

- **Backend:**

  - Node.js
  - Express.js (for serving static files)

- **Data:**
  - GeoJSON files containing multi-level administrative boundaries

---

## 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/imtiaz-ahmmed/poi-map.git
   cd projectname
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Start the server**
   ```bash
   node server.js
   ```
4. **Open in browser**
   ```bash
   http://localhost:3000
   ```

## 🌍 Features

1. Multi-level zoom-based boundary loading (Level 1 → Level 5)
2. Smooth map interactions (zoom, pan)
3. Custom logo and styles
4. GeoJSON-based data rendering

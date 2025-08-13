// Initialize the map
var map = L.map("map").setView([23.685, 90.3563], 6);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

let level1Layer, level2Layer, level3Layer, level4Layer, level5Layer;
const geojsonLayers = {};

// Palettes (unchanged)
const palettes = {
  level2: [
    "#1f77b4",
    "#ff4a0eff",
    "#2ca02c",
    "#a1d627ff",
    "#9467bd",
    "#fec718",
    "#0fa55d",
    "#7f7f7f",
  ],
  level3: ["#000000"],
  level4: ["#c30d0dff"],
  level5: ["#8da0cb"],
};

// Status colors
const statusColors = {
  Complete: "#A8E6A1", // light green
  Incomplete: "transparent", // no fill
  Partially: "#7251e9ff", // light red
  Ongoing: "#F28C28", // light yellow
  Pending: "transparent", // no fill
};

// In-memory map of statuses (updated when user submits)
const upazilaStatusMap = {};

// helper normalize
function normalize(s) {
  return (s || "").toString().trim().toLowerCase();
}

// styling factories
function uniformStyle(borderColor, fillColor) {
  return function (feature) {
    return {
      color: borderColor,
      weight: 0.5,
      fillColor: fillColor,
      fillOpacity: 0.5,
    };
  };
}

function uniqueColorStyle(palette) {
  return function (feature) {
    let idx = feature.properties._index ?? 0;
    let fillColor = palette[idx % palette.length];
    return {
      color: fillColor,
      weight: 0.5,
      fillColor: fillColor,
      fillOpacity: 0.6,
    };
  };
}

const level4BorderPalette = ["#e71d1dff"];

function statusBasedStyle(feature) {
  const props = feature.properties || {};
  const upazilaName = props.NAME_3;
  const status = upazilaStatusMap[upazilaName] || props.Status || "Pending";

  const fillColor = statusColors[status] || "transparent";

  // Pick unique border color from palette by _index
  const idx = feature.properties._index ?? 0;
  const borderColor = level4BorderPalette[idx % level4BorderPalette.length];

  return {
    color: borderColor,
    weight: 1,
    fillColor: fillColor,
    fillOpacity: fillColor === "transparent" ? 0 : 0.6,
  };
}
function statusFillOnlyStyle(feature) {
  const props = feature.properties || {};
  const upazilaName = props.NAME_3;
  const status = upazilaStatusMap[upazilaName] || props.Status || "Pending";
  const fillColor = statusColors[status] || "transparent";

  return {
    color: "transparent", // No border
    weight: 0,
    fillColor: fillColor,
    fillOpacity: fillColor === "transparent" ? 0 : 0.6,
  };
}

// Determine which "level" a feature belongs to (strings: level1..level5)
function getFeatureLevel(props) {
  if (props.NAME_5) return "level5";
  if (props.NAME_4) return "level4";
  if (props.NAME_3) return "level3";
  if (props.NAME_2) return "level2";
  if (props.NAME_1) return "level1";
  return null;
}

// Core click / tooltip behavior (no hover color change)
function onEachFeature(feature, layer) {
  let name =
    feature.properties.NAME_5 ||
    feature.properties.NAME_4 ||
    feature.properties.NAME_3 ||
    feature.properties.NAME_2 ||
    feature.properties.NAME_1 ||
    "Bangladesh";

  layer.bindTooltip(name, { sticky: true });

  layer.on("click", (e) => {
    const props = feature.properties;

    function getFeatureLevel(props) {
      if (props.NAME_5) return "level5";
      if (props.NAME_4) return "level4";
      if (props.NAME_3) return "level3";
      if (props.NAME_2) return "level2";
      if (props.NAME_1) return "level1";
      return "country";
    }

    function normalize(str) {
      return (str || "").trim().toLowerCase();
    }

    function getPOISum(level, props) {
      if (!level4Data || !level4Data.features) {
        console.warn("Level 4 data not loaded yet.");
        return 0;
      }

      let sum = 0;
      level4Data.features.forEach((f) => {
        const p = f.properties;
        const divMatch = normalize(p.NAME_1) === normalize(props.NAME_1);
        const distMatch = normalize(p.NAME_2) === normalize(props.NAME_2);
        const upaMatch = normalize(p.NAME_3) === normalize(props.NAME_3);

        if (level === "level1" && divMatch) {
          sum += Number(p.POI_Count || 0);
        } else if (level === "level2" && divMatch && distMatch) {
          sum += Number(p.POI_Count || 0);
        } else if (level === "level3" && divMatch && distMatch && upaMatch) {
          sum += Number(p.POI_Count || 0);
        }
      });

      return sum;
    }

    const level = getFeatureLevel(props);

    let popupContent = "";

    if (level === "country") {
      let totalPOI = 0;
      if (level4Data && level4Data.features) {
        level4Data.features.forEach((f) => {
          totalPOI += Number(f.properties.POI_Count || 0);
        });
      }

      popupContent += `
      <div style="font-weight:700; font-size:.7rem; margin-bottom:6px; max-width:160px; white-space:nowrap;">
        Bangladesh
      </div>
      <div style="display:flex; align-items:baseline; gap:6px; max-width:160px; white-space:nowrap;">
        <div style="font-weight:600; font-size:0.9rem; color:#1565c0;">
           POI:
        </div>
        <div style="font-weight:800; font-size:1.2rem; color:#0b3d91;">
          ${totalPOI}
        </div>
      </div>
    `;
    } else {
      const totalPOI = getPOISum(level, props);

      if (level === "level1") {
        popupContent += `
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:7px; max-width:160px; white-space:nowrap;">
          <div style="font-weight:600; font-size:.8rem; color:#283593;">Division:</div>
          <div style="font-size:.8rem;">${props.NAME_1}</div>
        </div>

        <div style="display:flex; align-items:center; gap:6px; margin-bottom:14px; max-width:160px; white-space:nowrap;">
          <div style="font-weight:600; font-size:.8rem; color:#283593;">POI :</div>
          <div style="font-size:1.1rem; font-weight:800; color:#1565c0; margin-top:0;">${totalPOI}</div>
        </div>
      `;
      } else if (level === "level2") {
        let upazilaMap = {};
        if (geojsonLayers.level4) {
          geojsonLayers.level4.eachLayer((l) => {
            const p = l.feature.properties;
            if (
              normalize(p.NAME_1) === normalize(props.NAME_1) &&
              normalize(p.NAME_2) === normalize(props.NAME_2)
            ) {
              upazilaMap[p.NAME_3] =
                (upazilaMap[p.NAME_3] || 0) + Number(p.POI_Count || 0);
            }
          });
        }

        popupContent += `
        <div style="font-weight:600; font-size:.8rem; margin-bottom:6px; color:#283593;">District: ${props.NAME_2}</div>
        <div style="font-weight:600; font-size:.8rem; margin-top:12px; color:#283593;">POI : ${totalPOI}</div>

        <div style="max-height: 150px; overflow-y: auto; border: 1px solid #c5cae9; margin-top: 8px;">
          <table style="width:100%; border-collapse:collapse; color:#3949ab; font-size:0.9rem;">
            <thead>
              <tr>
                <th style="border-bottom:.8px solid #c5cae9; padding:3px 4px; text-align:left; background:#e3f2fd; font-weight:700;">Upazila</th>
                <th style="border-bottom:1.5px solid #c5cae9; padding:6px 8px; text-align:left; background:#e3f2fd; font-weight:700;">POI: </th>
              </tr>
            </thead>
            <tbody>
      `;

        Object.entries(upazilaMap).forEach(([upz, count]) => {
          popupContent += `
          <tr>
            <td style="padding:2px 3px; border-bottom:1px solid #c5cae9;">${upz}</td>
            <td style="padding:2px 3px; border-bottom:1px solid #c5cae9;">${count}</td>
          </tr>
        `;
        });

        popupContent += `
            </tbody>
          </table>
        </div>
      `;
      } else if (level === "level3")
        popupContent += `
  <div style="font-weight:600; font-size:.8rem; margin-bottom:4px; color:#283593;">
    District: ${props.NAME_2}
  </div>
  <div style="font-weight:600; font-size:.8rem; margin-bottom:4px; color:#283593;">
    Upazila: ${props.NAME_3}
  </div>

  <div style="font-weight:600; font-size:.9rem; margin-bottom:8px; color:#1a237e;">
    POI: ${totalPOI}
  </div>

  <div style="background:#f3f4f6; padding:6px 10px; border-radius:6px; font-size:0.65rem; line-height:1.4; color:#37474f; border:1px solid #cfd8dc;">
    <div>Completed By: ${props.Completed_By || " "}</div>
    <div>Start Date: ${props.Start_Date || " "}</div>
    <div>End Date: ${props.End_Date || " "}</div>
  </div>
`;
    }

    L.popup({ maxWidth: 320 })
      .setLatLng(e.latlng)
      .setContent(popupContent)
      .openOn(map);
  });
}

// ---- AGGREGATION / SEARCH HELPERS ----

// Level4 features data holder (Upazila-level raw GeoJSON)
let level2Data, level3Data, level4Data;

// Sum POIs depending on clicked feature's level
function getPOISum(level, props) {
  if (!level4Data || !level4Data.features) {
    console.warn("level4Data not loaded yet.");
    return 0;
  }

  let lvlStr =
    typeof level === "string" ? level.toLowerCase() : "level" + level;

  let total = 0;

  level4Data.features.forEach((f) => {
    const p = f.properties;
    const divMatch = normalize(p.NAME_1) === normalize(props.NAME_1);
    const distMatch = normalize(p.NAME_2) === normalize(props.NAME_2);
    const upaMatch = normalize(p.NAME_3) === normalize(props.NAME_3);

    if (lvlStr === "level1") {
      // For level1 (division) return sum of all POIs in entire country (ignore division)
      total += Number(p.POI_Count || 0);
    } else if (lvlStr === "level2") {
      if (divMatch && distMatch) total += Number(p.POI_Count || 0);
    } else if (lvlStr === "level3") {
      if (divMatch && distMatch && upaMatch) total += Number(p.POI_Count || 0);
    }
  });

  return total;
}

// Return breakdown array [{name,total}, ...] for display in modal
function getPOIBreakdown(level, props) {
  if (!level4Data || !level4Data.features) return [];

  let lvlStr =
    typeof level === "string" ? level.toLowerCase() : "level" + level;

  const map = {}; // grouping map

  level4Data.features.forEach((f) => {
    const p = f.properties;
    if (lvlStr === "level1") {
      if (normalize(p.NAME_1) === normalize(props.NAME_1)) {
        const key = p.NAME_2 || "Unknown";
        map[key] = (map[key] || 0) + Number(p.POI_Count || 0);
      }
    } else if (lvlStr === "level2") {
      if (
        normalize(p.NAME_1) === normalize(props.NAME_1) &&
        normalize(p.NAME_2) === normalize(props.NAME_2)
      ) {
        const key = p.NAME_3 || "Unknown";
        map[key] = (map[key] || 0) + Number(p.POI_Count || 0);
      }
    } else if (lvlStr === "level3") {
      // For upazila, just show itself if matches
      if (
        normalize(p.NAME_1) === normalize(props.NAME_1) &&
        normalize(p.NAME_2) === normalize(props.NAME_2) &&
        normalize(p.NAME_3) === normalize(props.NAME_3)
      ) {
        map[p.NAME_3] = Number(p.POI_Count || 0);
      }
    }
  });

  // convert to array sorted by name
  return Object.keys(map)
    .sort()
    .map((k) => ({ name: k, total: map[k] }));
}

// ---- SEARCH INDEX (unchanged) ----
let searchableFeatures = [];

function addFeaturesForSearch(layer, level) {
  if (!layer) return;
  layer.eachLayer((l) => {
    const props = l.feature.properties;
    let nameProp;
    switch (level) {
      case "level2":
        nameProp = "NAME_1";
        break;
      case "level3":
        nameProp = "NAME_2";
        break;
      case "level4":
        nameProp = "NAME_3";
        break;
      case "level5":
        nameProp = "NAME_4";
        break;
      default:
        nameProp = null;
    }
    let name = props[nameProp];
    if (name) {
      searchableFeatures.push({
        name: name.toLowerCase(),
        displayName: name,
        layer: l,
        bounds: l.getBounds(),
      });
    }
  });
}

function prepareSearchIndex() {
  searchableFeatures.length = 0;
  addFeaturesForSearch(level2Layer, "level2");
  addFeaturesForSearch(level3Layer, "level3");
  addFeaturesForSearch(level4Layer, "level4");
  addFeaturesForSearch(level5Layer, "level5");
  console.log("Searchable features:", searchableFeatures.length);
}

function zoomToFeature(name) {
  const lowerName = name.toLowerCase();
  const matches = searchableFeatures.filter((f) => f.name.includes(lowerName));
  if (matches.length === 0) {
    alert("Place not found. Try exact name from level 2 to 5.");
    return;
  }

  const feature = matches[0];
  const layer = feature.layer;

  map.fitBounds(feature.bounds, { maxZoom: 14 });

  // Dim all non-matching layers
  Object.values(geojsonLayers).forEach((layerGroup) => {
    if (!layerGroup) return;
    layerGroup.eachLayer((l) => {
      if (l !== layer) {
        // Fade others (more dim than before)
        l.setStyle({
          fillOpacity: 0.05,
          opacity: 0.1,
        });
      }
    });
  });

  // Highlight the searched feature
  layer.setStyle({
    color: "#000",
    weight: 3,
    fillColor: "#f44336", // red highlight
    fillOpacity: 0.9,
    dashArray: "3, 3",
  });

  // Ensure it stays on top
  layer.bringToFront();

  if (layer._path) {
    layer._path.style.filter = "drop-shadow(0 0 6px #f44336)";
  }

  // Reset everything after 2.5 seconds
  setTimeout(() => {
    Object.entries(geojsonLayers).forEach(([level, layerGroup]) => {
      if (!layerGroup) return;

      // Restore styles per level
      if (level === "level4") {
        layerGroup.setStyle(statusBasedStyle);
      } else if (level === "level5") {
        layerGroup.setStyle(uniqueBoundaryStyle(palettes.level5));
      } else if (level === "level3") {
        layerGroup.setStyle(uniqueBoundaryStyle(palettes.level3));
      } else if (level === "level2") {
        layerGroup.setStyle(uniqueColorStyle(palettes.level2));
      } else if (level === "level1") {
        layerGroup.setStyle(uniformStyle("#D32F2F", "#FFCDD2"));
      }
    });

    // Remove drop-shadow if present
    if (layer._path) {
      layer._path.style.filter = "";
    }
  }, 2500);
}

// ---- LOADING LAYERS ----
function loadGeoJSON(url, styleFunc, levelName, isUnique = false) {
  return fetch(url)
    .then((r) => r.json())
    .then((data) => {
      if (isUnique) {
        data.features.forEach((f, idx) => (f.properties._index = idx));
      }
      const layer = L.geoJSON(data, {
        style: styleFunc,
        onEachFeature: onEachFeature,
      });
      geojsonLayers[levelName] = layer;
      return { layer, data };
    })
    .catch((err) => {
      console.error("Error loading", url, err);
      return null;
    });
}
function uniqueBoundaryStyle(palette) {
  return function (feature, layer) {
    const idx = feature.properties._index ?? 0;
    const borderColor = palette[idx % palette.length];

    return {
      color: borderColor,
      weight: 2,
      fillColor: "transparent",
      fillOpacity: 0,
    };
  };
}

Promise.all([
  loadGeoJSON(
    "data/level1.geojson",
    uniformStyle("#D32F2F", "#FFCDD2"),
    "level1"
  ),
  loadGeoJSON(
    "data/level2.geojson",
    uniqueColorStyle(palettes.level2),
    "level2",
    true
  ),
  loadGeoJSON(
    "data/level3.geojson",
    uniqueBoundaryStyle(palettes.level3),
    "level3",
    true
  ),
  loadGeoJSON("data/level4.geojson", statusBasedStyle, "level4", true),
  loadGeoJSON(
    "data/level5.geojson",
    uniqueColorStyle(palettes.level5),
    "level5",
    true
  ),
]).then((results) => {
  // results are objects {layer, data}
  level1Layer = results[0]?.layer;
  level2Layer = results[1]?.layer;
  level3Layer = results[2]?.layer;
  level4Layer = results[3]?.layer;
  level5Layer = results[4]?.layer;

  level2Data = results[1]?.data;
  level3Data = results[2]?.data;
  level4Data = results[3]?.data;

  if (level1Layer) level1Layer.addTo(map);

  function updateLayers() {
    const z = map.getZoom();

    [level1Layer, level2Layer, level3Layer, level4Layer, level5Layer].forEach(
      (Lyr) => {
        if (Lyr) map.removeLayer(Lyr);
      }
    );

    if (z < 8) {
      if (level1Layer) map.addLayer(level1Layer);
    } else if (z >= 8 && z < 9) {
      if (level2Layer) map.addLayer(level2Layer);
    } else if (z >= 9 && z < 10) {
      if (level3Layer) {
        level3Layer.setStyle(uniqueBoundaryStyle(palettes.level3));
        level3Layer.eachLayer((layer) => {
          layer.options.interactive = true;
        });
        map.addLayer(level3Layer);
      }
    } else if (z >= 10 && z < 11) {
      if (level3Layer) {
        level3Layer.setStyle(uniqueBoundaryStyle(palettes.level3));
        level3Layer.eachLayer((layer) => {
          layer.options.interactive = false;
        });
        map.addLayer(level3Layer);
      }
      if (level4Layer) {
        level4Layer.setStyle(statusFillOnlyStyle);
        level4Layer.eachLayer((layer) => {
          layer.options.interactive = true; // enable clicks
        });
        map.addLayer(level4Layer);
      }
    } else if (z >= 11 && z < 12) {
      if (level3Layer) {
        level3Layer.setStyle(uniqueBoundaryStyle(palettes.level3));
        level3Layer.eachLayer((layer) => {
          layer.options.interactive = false;
        });
        map.addLayer(level3Layer);
      }
      if (level4Layer) {
        level4Layer.setStyle(statusBasedStyle);
        level4Layer.eachLayer((layer) => {
          layer.options.interactive = true;
        });
        map.addLayer(level4Layer);
      }
    } else if (z >= 12) {
      // Level 5 visible
      if (level5Layer) {
        level5Layer.setStyle(uniqueBoundaryStyle(palettes.level5));
        level5Layer.eachLayer((layer) => {
          layer.options.interactive = true;
        });
        map.addLayer(level5Layer);
      }

      if (level4Layer) {
        level4Layer.setStyle(statusBasedStyle);
        level4Layer.eachLayer((layer) => {
          layer.options.interactive = false;
        });
        map.addLayer(level4Layer);
      }

      if (level3Layer) {
        level3Layer.setStyle(uniqueBoundaryStyle(palettes.level3));
        level3Layer.eachLayer((layer) => {
          layer.options.interactive = false;
        });
        map.addLayer(level3Layer);
        level3Layer.bringToFront();
      }
    }
  }

  map.on("zoomend", updateLayers);
  updateLayers();

  // populate dropdowns and search index
  populateDivisionDropdown();
  prepareSearchIndex();
});

// ---- DROPDOWNS (cascading) ----
function populateDivisionDropdown() {
  const divisionSelect = document.getElementById("divisionSelect");
  if (!divisionSelect || !level2Data) return;
  divisionSelect.innerHTML = '<option value="">-- Select Division --</option>';
  const divisions = [
    ...new Set(level2Data.features.map((f) => f.properties.NAME_1)),
  ].sort();
  divisions.forEach((d) => {
    const o = document.createElement("option");
    o.value = d;
    o.textContent = d;
    divisionSelect.appendChild(o);
  });
  resetDistrictDropdown();
  resetUpazilaDropdown();
}
function resetDistrictDropdown() {
  const s = document.getElementById("districtSelect");
  if (!s) return;
  s.innerHTML = '<option value="">-- Select District --</option>';
  s.disabled = true;
}
function resetUpazilaDropdown() {
  const s = document.getElementById("upazilaSelect");
  if (!s) return;
  s.innerHTML = '<option value="">-- Select Upazila --</option>';
  s.disabled = true;
}

document.getElementById("divisionSelect")?.addEventListener("change", (e) => {
  const division = e.target.value;
  const districtSelect = document.getElementById("districtSelect");
  resetDistrictDropdown();
  resetUpazilaDropdown();
  if (!division || !level3Data) return;
  const districts = level3Data.features
    .filter((f) => normalize(f.properties.NAME_1) === normalize(division))
    .map((f) => f.properties.NAME_2);
  [...new Set(districts)].sort().forEach((dist) => {
    const o = document.createElement("option");
    o.value = dist;
    o.textContent = dist;
    districtSelect.appendChild(o);
  });
  districtSelect.disabled = false;
});

document.getElementById("districtSelect")?.addEventListener("change", (e) => {
  const district = e.target.value;
  const division = document.getElementById("divisionSelect").value;
  const upazilaSelect = document.getElementById("upazilaSelect");
  resetUpazilaDropdown();
  if (!district || !division || !level4Data) return;
  const upazilas = level4Data.features
    .filter(
      (f) =>
        normalize(f.properties.NAME_1) === normalize(division) &&
        normalize(f.properties.NAME_2) === normalize(district)
    )
    .map((f) => f.properties.NAME_3);
  [...new Set(upazilas)].sort().forEach((upz) => {
    const o = document.createElement("option");
    o.value = upz;
    o.textContent = upz;
    upazilaSelect.appendChild(o);
  });
  upazilaSelect.disabled = false;
});
document
  .getElementById("upazilaSelect")
  ?.addEventListener("change", async (e) => {
    const division = document.getElementById("divisionSelect").value;
    const district = document.getElementById("districtSelect").value;
    const upazila = e.target.value;

    if (!division || !district || !upazila) {
      document.getElementById("poiCount").value = "";
      document.getElementById("statusSelect").value = "";
      document.getElementById("notes").value = "";
      return;
    }

    try {
      const res = await fetch(
        `/get-poi?division=${encodeURIComponent(
          division
        )}&district=${encodeURIComponent(
          district
        )}&upazila=${encodeURIComponent(upazila)}`
      );
      if (!res.ok) throw new Error("Failed to fetch POI data");

      const data = await res.json();

      // Populate form fields
      document.getElementById("poiCount").value = data.poiCount ?? "";
      document.getElementById("statusSelect").value = data.status ?? "";
      document.getElementById("notes").value = data.notes ?? "";
    } catch (err) {
      console.error(err);
      alert("Could not load existing POI data.");

      document.getElementById("poiCount").value = "";
      document.getElementById("statusSelect").value = "";
      document.getElementById("notes").value = "";
    }
  });
// ---- SIDEBAR open/close (unchanged) ----
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const hamburger = document.getElementById("hamburger");
  const closeBtn = document.getElementById("closeSidebar");

  // Secret security code:
  const SECURITY_CODE = "znzit";

  if (!sidebar || !hamburger || !closeBtn) return;

  // Function to open sidebar
  const openSidebar = () => {
    sidebar.classList.add("open");
    document.body.classList.add("sidebar-open");
    hamburger.setAttribute("aria-expanded", "true");
  };

  // Function to close sidebar
  const closeSidebar = () => {
    sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
    hamburger.setAttribute("aria-expanded", "false");
  };

  // When user clicks hamburger, ask for security code first
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();

    // If sidebar is already open, just close it
    if (sidebar.classList.contains("open")) {
      closeSidebar();
      return;
    }

    // Check if the code was already verified in this session
    const isVerified = sessionStorage.getItem("sidebarSecurityVerified");

    if (isVerified === "true") {
      openSidebar();
      return;
    }

    // Ask for security code
    const enteredCode = prompt("Enter security code to open sidebar:");

    if (enteredCode === SECURITY_CODE) {
      sessionStorage.setItem("sidebarSecurityVerified", "true");
      openSidebar();
    } else {
      alert("Incorrect security code. Access denied.");
    }
  });

  // Close sidebar when clicking close button
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeSidebar();
  });

  // Close sidebar if click outside sidebar or hamburger
  document.addEventListener("click", (e) => {
    if (!sidebar.classList.contains("open")) return;
    if (sidebar.contains(e.target) || hamburger.contains(e.target)) return;
    closeSidebar();
  });

  // Close sidebar on Escape key press
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("open")) {
      closeSidebar();
    }
  });
});

// ---- MODAL close logic ----
document.getElementById("closeModal")?.addEventListener("click", () => {
  document.getElementById("infoModal").style.display = "none";
});
window.addEventListener("click", (ev) => {
  const modal = document.getElementById("infoModal");
  if (ev.target === modal) modal.style.display = "none";
});
function showToast(message, duration = 3000) {
  const toast = document.getElementById("toast");
  toast.textContent = message;

  toast.classList.remove("toast-hidden");
  toast.classList.add("toast-show");

  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.classList.add("toast-hidden");
  }, duration);
}

// ---- SEARCH interactions ----
document.getElementById("searchBtn")?.addEventListener("click", () => {
  const q = document.getElementById("searchInput").value.trim();
  if (q) zoomToFeature(q);
});
document.getElementById("searchInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const q = e.target.value.trim();
    if (q) zoomToFeature(q);
  }
});

// ---- POI update form ----
document
  .getElementById("updatePOIForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const division = document.getElementById("divisionSelect").value;
    const district = document.getElementById("districtSelect").value;
    const upazila = document.getElementById("upazilaSelect").value;
    const poiCount = parseInt(document.getElementById("poiCount").value, 10);
    const status = document.getElementById("statusSelect").value;
    const notes = document.getElementById("notes").value.trim();
    const userName = document.getElementById("userName").value.trim();
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    if (!division || !district || !upazila) {
      alert("Please select Division, District, and Upazila.");
      return;
    }
    if (isNaN(poiCount) || poiCount < 0) {
      alert("Please enter a valid POI count (0 or more).");
      return;
    }
    if (!status) {
      alert("Please select a status.");
      return;
    }

    try {
      const res = await fetch("/update-poi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          division,
          district,
          upazila,
          poiCount,
          status,
          userName,
          startDate,
          endDate,
          notes,
        }),
      });
      const data = await res.json();
      showToast(data.message || data.error || "Update completed");

      if (res.ok) {
        // reflect changes in memory (level4Data) and on the drawn layer
        upazilaStatusMap[upazila] = status;

        if (level4Data && level4Data.features) {
          // update the geojson object
          let updated = false;
          level4Data.features.forEach((f) => {
            const p = f.properties;
            if (
              normalize(p.NAME_1) === normalize(division) &&
              normalize(p.NAME_2) === normalize(district) &&
              normalize(p.NAME_3) === normalize(upazila)
            ) {
              p.POI_Count = poiCount;
              p.Status = status;
              p.Notes = notes;
              p.Completed_By = userName;
              p.Start_Date = startDate;
              p.End_Date = endDate;
              updated = true;
            }
          });

          // update the visible layer features
          if (level4Layer) {
            level4Layer.eachLayer((ly) => {
              const p = ly.feature.properties;
              if (
                normalize(p.NAME_1) === normalize(division) &&
                normalize(p.NAME_2) === normalize(district) &&
                normalize(p.NAME_3) === normalize(upazila)
              ) {
                ly.feature.properties.POI_Count = poiCount;
                ly.feature.properties.Status = status;
                ly.feature.properties.Notes = notes;
                ly.feature.properties.Completed_By = userName;
                ly.feature.properties.Start_Date = startDate;
                ly.feature.properties.End_Date = endDate;
                ly.setStyle && ly.setStyle(statusBasedStyle(ly.feature));
              }
            });
          }

          if (!updated) {
            console.warn(
              "Updated on server but couldn't find matching feature in level4Data"
            );
          } else {
            prepareSearchIndex();
          }
        }

        // RESET FORM HERE:
        e.target.reset();

        // Disable district and upazila selects after reset
        document.getElementById("districtSelect").disabled = true;
        document.getElementById("upazilaSelect").disabled = true;
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating POI data");
    }
  });

const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve index.html, script.js, style.css

// Helper to normalize strings for case-insensitive matching
const normalize = (s) => (s || "").toString().trim().toLowerCase();

app.get("/get-poi", (req, res) => {
  const { division, district, upazila } = req.query;

  if (!division) {
    return res.status(400).send({ error: "Division is required" });
  }

  let level, filePath;

  if (upazila) {
    level = 4;
    filePath = path.join(__dirname, "data", "level4.geojson");
  } else if (district) {
    level = 3;
    filePath = path.join(__dirname, "data", "level3.geojson");
  } else if (division) {
    level = 2;
    filePath = path.join(__dirname, "data", "level2.geojson");
  } else {
    return res.status(400).send({ error: "Invalid parameters" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ error: "GeoJSON file not found" });
  }

  let geojson;
  try {
    geojson = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    return res.status(500).send({ error: "Failed to read GeoJSON file" });
  }

  // Find matching feature
  const feature = geojson.features.find((feature) => {
    const props = feature.properties;
    const divMatch = normalize(props.NAME_1) === normalize(division);
    const distMatch = district
      ? normalize(props.NAME_2) === normalize(district)
      : true;
    const upaMatch = upazila
      ? normalize(props.NAME_3) === normalize(upazila)
      : true;
    return divMatch && distMatch && upaMatch;
  });

  if (!feature) {
    return res.status(404).send({ error: "Place not found" });
  }

  const { POI_Count, Status, Notes, Completed_By, Start_Date, End_Date } =
    feature.properties;

  res.send({
    poiCount: POI_Count || 0,
    status: Status || "",
    notes: Notes || "",
    userName: Completed_By || "",
    startDate: Start_Date || "",
    endDate: End_Date || "",
  });
});

// API to update POI details in a GeoJSON file
app.post("/update-poi", (req, res) => {
  const {
    division,
    district,
    upazila,
    poiCount,
    status,
    notes,
    userName,
    startDate,
    endDate,
  } = req.body;

  // Validate POI count
  if (poiCount == null || isNaN(poiCount) || poiCount < 0) {
    return res
      .status(400)
      .send({ error: "POI Count must be a non-negative number" });
  }

  // Validate status
  const allowedStatuses = ["Complete", "Incomplete", "Ongoing", "Partially"];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).send({
      error: `Status is required and must be one of: ${allowedStatuses.join(
        ", "
      )}`,
    });
  }

  // Determine level and file path based on selection priority: upazila > district > division
  let level, filePath;

  if (upazila) {
    level = 4;
    filePath = path.join(__dirname, "data", "level4.geojson");
  } else if (district) {
    level = 3;
    filePath = path.join(__dirname, "data", "level3.geojson");
  } else if (division) {
    level = 2;
    filePath = path.join(__dirname, "data", "level2.geojson");
  } else {
    return res
      .status(400)
      .send({ error: "At least division must be selected" });
  }

  if (!fs.existsSync(filePath)) {
    return res
      .status(404)
      .send({ error: `GeoJSON file for level ${level} not found` });
  }

  let geojson;
  try {
    geojson = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    return res.status(500).send({ error: "Failed to read GeoJSON file" });
  }

  let updated = false;
  geojson.features.forEach((feature) => {
    const props = feature.properties;

    // Match features strictly by division, district, and upazila (if applicable)
    const divMatch = division
      ? normalize(props.NAME_1) === normalize(division)
      : true;
    const distMatch = district
      ? normalize(props.NAME_2) === normalize(district)
      : true;
    const upaMatch = upazila
      ? normalize(props.NAME_3) === normalize(upazila)
      : true;

    if (divMatch && distMatch && upaMatch) {
      props.POI_Count = poiCount;
      props.Status = status;
      props.Notes = notes ? notes.toString() : "";
      props.Completed_By = userName || "";
      props.Start_Date = startDate || "";
      props.End_Date = endDate || "";
      updated = true;
    }
  });

  if (!updated) {
    return res.status(404).send({ error: "Place not found in GeoJSON" });
  }

  try {
    fs.writeFileSync(filePath, JSON.stringify(geojson, null, 2));
  } catch (err) {
    return res.status(500).send({ error: "Failed to write GeoJSON file" });
  }

  res.send({ message: "POI details updated successfully" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

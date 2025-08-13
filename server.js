const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));

const normalize = (s) => (s || "").toString().trim().toLowerCase();

// Cache object
const geoCache = {};

// Load a file into cache
async function loadGeoFile(level) {
  if (geoCache[level]) return geoCache[level]; // return from cache
  const filePath = path.join(__dirname, "data", `level${level}.geojson`);
  const data = await fs.readFile(filePath, "utf8");
  geoCache[level] = JSON.parse(data);
  return geoCache[level];
}

// Save a file from cache to disk
async function saveGeoFile(level) {
  const filePath = path.join(__dirname, "data", `level${level}.geojson`);
  await fs.writeFile(
    filePath,
    JSON.stringify(geoCache[level], null, 2),
    "utf8"
  );
}

app.get("/get-poi", async (req, res) => {
  try {
    const { division, district, upazila } = req.query;

    if (!division) {
      return res.status(400).send({ error: "Division is required" });
    }

    let level = upazila ? 4 : district ? 3 : 2;
    const geojson = await loadGeoFile(level);

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
  } catch (err) {
    res.status(500).send({ error: "Failed to read data" });
  }
});

app.post("/update-poi", async (req, res) => {
  try {
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

    let level = upazila ? 4 : district ? 3 : 2;
    const geojson = await loadGeoFile(level);

    let updated = false;
    geojson.features.forEach((feature) => {
      const props = feature.properties;
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

    await saveGeoFile(level);

    res.send({ message: "POI details updated successfully" });
  } catch (err) {
    res.status(500).send({ error: "Failed to update data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

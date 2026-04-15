const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { buildProfile } = require("../utils/external");
const { uuidv7 } = require("../utils/uuid");

router.post("/", async (req, res) => {
  const name = req.body && req.body.name;

  if (name === undefined || name === null || String(name).trim() === "") {
    return res.status(400).json({ status: "error", message: "name is required" });
  }

  if (typeof name !== "string") {
    return res.status(422).json({ status: "error", message: "name must be a string" });
  }

  const cleanName = name.trim().toLowerCase();
  const db = getDb();
  const existing = db.prepare("SELECT * FROM profiles WHERE name = ?").get(cleanName);
  if (existing) {
    return res.status(200).json({
      status: "success",
      message: "Profile already exists",
      data: existing,
    });
  }

  let profileData;
  try {
    profileData = await buildProfile(cleanName);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ status: "error", message: err.message });
  }

  const id = uuidv7();
  const created_at = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    cleanName,
    profileData.gender,
    profileData.gender_probability,
    profileData.sample_size,
    profileData.age,
    profileData.age_group,
    profileData.country_id,
    profileData.country_probability,
    created_at
  );

  const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id);

  return res.status(201).json({ status: "success", data: profile });
});

router.get("/", (req, res) => {
  const db = getDb();
  let query = "SELECT * FROM profiles WHERE 1=1";
  const params = [];

  if (req.query.gender) {
    query += " AND LOWER(gender) = ?";
    params.push(req.query.gender.toLowerCase());
  }
  if (req.query.country_id) {
    query += " AND LOWER(country_id) = ?";
    params.push(req.query.country_id.toLowerCase());
  }
  if (req.query.age_group) {
    query += " AND LOWER(age_group) = ?";
    params.push(req.query.age_group.toLowerCase());
  }

  const rows = db.prepare(query).all(...params);

  return res.status(200).json({
    status: "success",
    count: rows.length,
    data: rows,
  });
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(req.params.id);

  if (!profile) {
    return res.status(404).json({ status: "error", message: "Profile not found" });
  }

  return res.status(200).json({ status: "success", data: profile });
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const profile = db.prepare("SELECT id FROM profiles WHERE id = ?").get(req.params.id);

  if (!profile) {
    return res.status(404).json({ status: "error", message: "Profile not found" });
  }

  db.prepare("DELETE FROM profiles WHERE id = ?").run(req.params.id);
  return res.sendStatus(204);
});

module.exports = router;
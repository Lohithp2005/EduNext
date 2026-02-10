"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function Page() {
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch student profile from backend
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/student/1");
        const data = await res.json();

        if (data.error) {
          setStudentData(null);
        } else {
          setStudentData(data);
        }
      } catch (error) {
        console.log("Fetch error:", error);
        setStudentData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, []);

  // ✅ Status checker
  const getStatus = (score: number) => {
    if (score === 0) return "🔴 Critical";
    if (score < 50) return "🟠 Weak";
    if (score <= 70) return "🟡 Average";
    return "🟢 Strong";
  };

  // ✅ Predict Study Time (minutes/day)
  const predictStudyTime = (scores: any) => {
    const total =
      scores.visualSpatial +
      scores.workingMemory +
      scores.reactionTime +
      scores.attention +
      scores.auditoryProcessing +
      scores.reasoning;

    const minutes = Math.round((total / 600) * 180);
    return minutes < 15 ? 15 : minutes;
  };

  // ✅ Generate dashboard values
  const dashboardData = useMemo(() => {
    if (!studentData) return null;

    const scores = studentData.cognitiveScores;

    const dailyTime = predictStudyTime(scores);
    const weeklyAvg = Math.round((dailyTime * 7) / 60);

    const consistency =
      dailyTime > 90 ? "High" : dailyTime > 45 ? "Medium" : "Low";

    const predictedQuizScore = Math.round(
      scores.reactionTime * 0.3 +
        scores.visualSpatial * 0.2 +
        scores.workingMemory * 0.2 +
        scores.attention * 0.15 +
        scores.reasoning * 0.15
    );

    const quizScore = predictedQuizScore < 20 ? 20 : predictedQuizScore;

    const accuracy =
      scores.attention === 0 || scores.workingMemory === 0
        ? "Low"
        : quizScore > 70
        ? "High"
        : "Medium";

    const speed =
      scores.reactionTime > 70
        ? "Fast"
        : scores.reactionTime > 40
        ? "Medium"
        : "Slow";

    // Weekly Improvement Graph
    const weeklyProgress = [
      { week: "Week 1", score: Math.max(quizScore - 20, 10) },
      { week: "Week 2", score: Math.max(quizScore - 10, 15) },
      { week: "Week 3", score: Math.max(quizScore, 20) },
      { week: "Week 4", score: Math.min(quizScore + 20, 100) },
    ];

    // Study Time Graph
    const studyTimeGraph = [
      { day: "Day 1", minutes: Math.max(dailyTime - 10, 10) },
      { day: "Day 2", minutes: Math.max(dailyTime - 5, 10) },
      { day: "Day 3", minutes: dailyTime },
      { day: "Day 4", minutes: dailyTime + 10 },
      { day: "Day 5", minutes: dailyTime + 20 },
    ];

    // Quiz Growth Graph
    const quizGraph = [
      { quiz: "Quiz 1", score: Math.max(quizScore - 15, 10) },
      { quiz: "Quiz 2", score: Math.max(quizScore - 5, 15) },
      { quiz: "Quiz 3", score: quizScore },
      { quiz: "Quiz 4", score: Math.min(quizScore + 15, 100) },
    ];

    return {
      dailyTime,
      weeklyAvg,
      consistency,
      quizScore,
      accuracy,
      speed,
      weeklyProgress,
      studyTimeGraph,
      quizGraph,
    };
  }, [studentData]);

  // ✅ Loading screen
  if (loading) {
    return (
      <div style={styles.loadingBox}>
        <h2 style={{ color: "#333" }}>⏳ Loading Dashboard...</h2>
      </div>
    );
  }

  // ✅ Student not found
  if (!studentData || !dashboardData) {
    return (
      <div style={styles.loadingBox}>
        <h2 style={{ color: "red" }}>❌ Student Data Not Found</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 EduTech Parent Dashboard</h1>
        <p style={styles.subtitle}>
          Student: <b>{studentData.name}</b> | Age: <b>{studentData.age}</b>
        </p>
      </div>

      {/* Summary Cards */}
      <div style={styles.cardGrid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>⏱️ Time Spent Daily</h3>
          <p style={styles.cardValue}>{dashboardData.dailyTime} mins/day</p>
          <p style={styles.cardSmall}>Weekly Avg: {dashboardData.weeklyAvg} hrs</p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📌 Consistency</h3>
          <p style={styles.cardValue}>
            {dashboardData.consistency === "High"
              ? "🟢 High"
              : dashboardData.consistency === "Medium"
              ? "🟡 Medium"
              : "🔴 Low"}
          </p>
          <p style={styles.cardSmall}>Based on routine</p>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📝 Quiz Performance</h3>
          <p style={styles.cardValue}>{dashboardData.quizScore}%</p>
          <p style={styles.cardSmall}>
            Accuracy: {dashboardData.accuracy} | Speed: {dashboardData.speed}
          </p>
        </div>
      </div>

      {/* Graph Section */}
      <div style={styles.graphGrid}>
        <div style={styles.graphCard}>
          <h3 style={styles.graphTitle}>📈 Weekly Improvement</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dashboardData.weeklyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.graphCard}>
          <h3 style={styles.graphTitle}>⏱️ Study Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dashboardData.studyTimeGraph}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="minutes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.graphCard}>
          <h3 style={styles.graphTitle}>📝 Quiz Growth</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dashboardData.quizGraph}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quiz" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weak Topics Table */}
      <div style={styles.tableCard}>
        <h3 style={styles.graphTitle}>🚨 Weak Topics</h3>

        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeadRow}>
              <th style={styles.tableHead}>Skill Area</th>
              <th style={styles.tableHead}>Score</th>
              <th style={styles.tableHead}>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(studentData.cognitiveScores).map(([key, value]) => (
              <tr key={key} style={styles.tableRow}>
                <td style={styles.tableCell}>{key}</td>
                <td style={styles.tableCell}>{value as number}</td>
                <td style={styles.tableCell}>{getStatus(value as number)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Suggestions */}
      <div style={styles.footer}>
        <h3 style={styles.footerTitle}>✅ Parent Suggestions</h3>
        <ul style={styles.list}>
          <li>📌 Encourage short daily study sessions (30–45 mins).</li>
          <li>🧠 Use flashcards & memory games to improve memory.</li>
          <li>🎯 Practice reasoning puzzles and small quizzes.</li>
          <li>📈 Track weekly progress continuously.</li>
        </ul>
      </div>
    </div>
  );
}

// 🎨 UI Styling
const styles: any = {
  container: {
    fontFamily: "Arial, sans-serif",
    background: "#f5f7fb",
    padding: "20px",
    minHeight: "100vh",
  },
  loadingBox: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f7fb",
  },
  header: {
    textAlign: "center",
    marginBottom: "25px",
  },
  title: {
    fontSize: "30px",
    fontWeight: "bold",
    color: "#222",
  },
  subtitle: {
    fontSize: "16px",
    color: "#555",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "15px",
    marginBottom: "25px",
  },
  card: {
    background: "#fff",
    padding: "18px",
    borderRadius: "15px",
    boxShadow: "0px 4px 10px rgba(0,0,0,0.08)",
  },
  cardTitle: {
    fontSize: "18px",
    color: "#333",
    marginBottom: "10px",
  },
  cardValue: {
    fontSize: "26px",
    fontWeight: "bold",
    color: "#111",
  },
  cardSmall: {
    fontSize: "14px",
    color: "#666",
  },
  graphGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "15px",
    marginBottom: "25px",
  },
  graphCard: {
    background: "#fff",
    padding: "18px",
    borderRadius: "15px",
    boxShadow: "0px 4px 10px rgba(0,0,0,0.08)",
  },
  graphTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "12px",
    color: "#222",
  },
  tableCard: {
    background: "#fff",
    padding: "18px",
    borderRadius: "15px",
    boxShadow: "0px 4px 10px rgba(0,0,0,0.08)",
    marginBottom: "25px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  tableHeadRow: {
    background: "#f0f2f8",
  },
  tableHead: {
    padding: "12px",
    textAlign: "left",
    fontWeight: "bold",
    color: "#333",
  },
  tableRow: {
    borderBottom: "1px solid #eee",
  },
  tableCell: {
    padding: "12px",
    color: "#444",
    fontSize: "15px",
  },
  footer: {
    background: "#fff",
    padding: "18px",
    borderRadius: "15px",
    boxShadow: "0px 4px 10px rgba(0,0,0,0.08)",
  },
  footerTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  list: {
    color: "#444",
    fontSize: "15px",
    lineHeight: "1.7",
  },
};

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/home";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
          fontFamily: "'Tajawal',sans-serif",
          direction: "rtl",
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            background: "#fff",
            borderRadius: 20,
            padding: 32,
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 14 }}>😵‍💫</div>
          <h2 style={{ fontWeight: 900, color: "#0F172A", marginBottom: 10 }}>حدث خطأ غير متوقع</h2>
          <p style={{ color: "#64748B", marginBottom: 20, fontSize: 14 }}>
            نعتذر، حدث خطأ أثناء عرض هذه الصفحة. يمكنك العودة للصفحة الرئيسية.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px 28px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Tajawal',sans-serif",
              fontSize: 14,
            }}
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }
}

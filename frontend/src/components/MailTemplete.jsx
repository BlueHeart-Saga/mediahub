import React from 'react';

const MailTemplate = ({ 
  title = "Help Us Decide What To Build Next", 
  subtitle = "At Devopstrio, we're always looking for ways to improve our newsletter so that it better meets your needs. We'd therefore like to invite you to participate in a brief survey to share with us the topics that matter most to you.",
  heroImage = "https://img.freepik.com/premium-vector/paper-plane-flying-up-sky-growth-concept-business-success-startup-vision_101884-1135.jpg?w=1000", 
  linkUrl = "https://devopstrio.co.uk/insights-knowledge/blogs/",
  companyName = "Devopstrio",
  incentiveMessage = "As a thank you, you'll be entered into a raffle to win one of our premium DevOps strategy guides or a consultation session of your choice."
}) => {
  const brandColor = "#4a6cf7"; // Miro-style blue, or use #ce2453 if you prefer your brand color
  
  const containerStyle = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "40px 20px",
    maxWidth: "600px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#050038", // Miro's deep blue/black text color
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px",
  };

  const heroTitleStyle = {
    fontSize: "40px",
    fontWeight: "800",
    lineHeight: "1.1",
    margin: "0 0 30px 0",
    letterSpacing: "-0.02em",
  };

  const heroImageContainerStyle = {
    width: "100%",
    borderRadius: "24px",
    overflow: "hidden",
    marginBottom: "40px",
    backgroundColor: "#fff0f0", // Light pinkish background like in the image
    textAlign: "center"
  };

  const paragraphStyle = {
    fontSize: "16px",
    lineHeight: "1.6",
    marginBottom: "24px",
    color: "#050038",
  };

  const buttonStyle = {
    display: "inline-block",
    backgroundColor: brandColor,
    color: "#ffffff",
    padding: "16px 32px",
    borderRadius: "100px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "16px",
    marginBottom: "40px",
    transition: "background-color 0.2s",
  };

  const incentiveBoxStyle = {
    backgroundColor: "#f0f0ff", // Very light purple/blue
    padding: "32px",
    borderRadius: "16px",
    marginBottom: "40px",
  };

  const signOffStyle = {
    fontSize: "16px",
    lineHeight: "1.6",
    marginTop: "40px",
  };

  return (
    <div style={{ backgroundColor: "#fdfdfd", padding: "20px" }}>
      <div style={containerStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", fontWeight: "900", fontSize: "24px" }}>
            <div style={{ 
              width: "32px", 
              height: "32px", 
              backgroundColor: "#ffc017", 
              marginRight: "10px", 
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {/* Simple geometric logo placeholder */}
              <div style={{ width: "16px", height: "16px", borderLeft: "4px solid #050038", borderBottom: "4px solid #050038", transform: "rotate(-45deg)" }}></div>
            </div>
            {companyName.toLowerCase()}
          </div>
          <a href={linkUrl} style={{ color: brandColor, textDecoration: "none", fontWeight: "600", fontSize: "14px" }}>
            View in browser →
          </a>
        </div>

        {/* Hero Title */}
        <h1 style={heroTitleStyle}>{title}</h1>

        {/* Hero Image / Illustration Placeholder */}
        <div style={heroImageContainerStyle}>
          <img 
            src={heroImage} 
            alt="Illustration" 
            style={{ width: "100%", maxHeight: "300px", objectFit: "contain", padding: "20px" }} 
          />
        </div>

        {/* content */}
        <p style={paragraphStyle}>
          {subtitle}
        </p>

        <p style={paragraphStyle}>
          Your input will help shape the functionalities and products we develop for {companyName}.
        </p>

        {/* Primary CTA */}
        <a href={linkUrl} style={buttonStyle}>
          Read full article →
        </a>

        {/* Incentive Box */}
        <div style={incentiveBoxStyle}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: "700" }}>As a thank you</h3>
          <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.5" }}>
            {incentiveMessage}
          </p>
        </div>

        {/* Footer Sign-off */}
        <div style={signOffStyle}>
          <p style={{ margin: 0 }}>Thank you, and happy collaborating!</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: "700" }}>The {companyName} Research Team</p>
        </div>

      </div>
    </div>
  );
};

export default MailTemplate;

// generateRaw.ts
import "dotenv/config"; // so you can use process.env

const generateRawEmail = async () => {
  const messageParts = [
    `From: "LTO NAIC" <${process.env.EMAIL_USER}>`, // your Gmail
    `To: stevenedwardobillemontalvo@gmail.com`, // recipient
    `Subject: Test Email`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    "<p>Hello, this is a test email.</p>",
  ];

  const message = messageParts.join("\n");

  // base64url encode
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log("Copy this into Gmail API raw field:\n");
  console.log(encodedMessage);
};

generateRawEmail();
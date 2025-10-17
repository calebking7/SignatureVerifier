# Digital Signature Verifier - Ibadan City Polytechnic

A web-based application for verifying digital signatures using AI technology.

## Setup Instructions

1. Clone the repository:
```bash
git clone <your-repository-url>
cd <repository-name>
```

2. Set up environment variables:
   - Copy `.env.example` to create a new `.env` file:
   ```bash
   cp .env.example .env
   ```
   - Open `.env` and fill in your actual API keys:
     - SUPABASE_URL: Your Supabase project URL
     - SUPABASE_KEY: Your Supabase anonymous key
     - GEMINI_API_KEY: Your Google Gemini API key
     - GEMINI_MODEL: The Gemini model to use (default: gemini-2.0-flash)

3. Run the application:
   - Use a local server to serve the files (e.g., Live Server in VS Code)
   - Open the application in your browser

## Security Notes

- Never commit the `.env` file to version control
- Keep your API keys confidential
- Regularly rotate your API keys for security
- Use environment variables for all sensitive information

## Features

- Secure authentication with Supabase
- AI-powered signature verification using Google's Gemini
- Real-time signature comparison
- Confidence score analysis
- Detailed reporting
- User history tracking

## Technologies Used

- HTML/CSS/JavaScript
- Tailwind CSS
- Supabase for authentication and database
- Google Gemini AI for signature analysis

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Create a new Pull Request
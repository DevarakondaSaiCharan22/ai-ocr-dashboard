🔹 Project Title
AI Document Extraction Dashboard

🔹 Setup Steps
-> Backend
cd backend 
pip install -r requirements.txt 
uvicorn main:app --reload

-> Frontend
cd frontend 
npm install 
npm run dev

🔹 Architecture Overview
Frontend: Next.js (React UI for upload + results)
Backend: FastAPI (REST APIs)
OCR Engine: Tesseract (extracts text from images)

Flow:
User Upload → FastAPI → OCR → Text → Regex → JSON → UI

🔹 AI Approach
Used Tesseract OCR to convert images → text
Applied rule-based extraction (regex) to get:
Name
DOB
ID number
Designed system to be generic, not hardcoded for one document

🔹 Scaling Strategy
Parallel processing using ThreadPool (multiple files at once)
Stateless API design → easy to scale with containers
Can deploy using:
Docker
Cloud (AWS / GCP / Azure)
Future improvements:
Queue system (RabbitMQ / Kafka)
Microservices architecture

🔹 Cost Estimation
OCR tool (Tesseract) → Free
Local processing → ₹0 per document

If deployed on cloud:
Approx ₹0.05 per document
50 documents → ₹2 to ₹5

🔹 Limitations
OCR accuracy depends on image quality
Rule-based extraction may fail for complex layouts

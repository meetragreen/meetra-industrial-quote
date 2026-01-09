const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs-extra');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// --- 1. STORAGE ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, __dirname); },
    filename: function (req, file, cb) { cb(null, 'template.pdf'); }
});
const upload = multer({ storage: storage });

// --- 2. DATABASE ---
mongoose.connect('mongodb+srv://meetragreen:meetra123@cluster0.ray2juw.mongodb.net/meetraDB?appName=Cluster0')
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

const QuotationSchema = new mongoose.Schema({ seq: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', QuotationSchema);

// --- NEW LOGIC: HANDLE MANUAL OR AUTOMATIC SEQUENCE ---
async function getNextSequence(manualSeq) {
    let counter = await Counter.findOne();
    if (!counter) { counter = new Counter({ seq: 0 }); await counter.save(); }

    if (manualSeq && !isNaN(manualSeq)) {
        // If user typed '3', we update DB to 3 and use it
        const newSeq = parseInt(manualSeq);
        await Counter.updateOne({}, { seq: newSeq });
        return `MGE-I-25${newSeq.toString().padStart(2, '0')}`;
    } else {
        // Normal Auto Increment
        await Counter.updateOne({}, { $inc: { seq: 1 } });
        // Fetch again to get the new value
        const updatedCounter = await Counter.findOne();
        return `MGE-I-25${updatedCounter.seq.toString().padStart(2, '0')}`;
    }
}

// --- HELPER: FORMAT CURRENCY ---
const formatCurrency = (amount) => {
    if (!amount) return "0";
    const num = parseFloat(amount);
    if (isNaN(num)) return amount; 
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(num);
};

// --- 3. ROUTES ---
app.get('/check-template', async (req, res) => {
    const exists = await fs.pathExists(path.join(__dirname, 'template.pdf'));
    res.json({ exists: exists });
});

app.post('/upload-template', upload.single('templatePdf'), (req, res) => {
    if (req.file) res.json({ message: "Success" });
    else res.status(400).json({ message: "Fail" });
});

app.post('/generate-quotation', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'template.pdf');
        if (!await fs.pathExists(filePath)) return res.status(400).send("No Template Found");

        const data = req.body;
        const autoDate = new Date().toLocaleDateString("en-IN");
        
        // PASS THE MANUAL SEQUENCE (IF ANY) TO THE FUNCTION
        const autoQuotNo = await getNextSequence(data.startSeq);
        
        const existingPdfBytes = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica); 
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();

        const WHITE = rgb(1, 1, 1);
        const BLACK = rgb(0, 0, 0);
        const MEETRA_GREEN = rgb(0.12, 0.45, 0.22); 

        const replacements = [
            // --- PAGE 2 ---
            { val: autoQuotNo, page: 1, x: 280, y: 652, font: fontBold },      
            { val: autoDate, page: 1, x: 280, y: 600, font: font },            
            { val: data.customerName, page: 1, x: 280, y: 505, font: fontBold }, 
            { val: `${data.plantCapacity} kW`, page: 1, x: 280, y: 455, font: font }, 
            { val: data.location, page: 1, x: 280, y: 410, font: font },       
            
            // 6----- (Green & Centered)
            { 
                val: data.customerName, 
                page: 1, 
                x: 0, 
                y: 175, 
                font: fontBold, 
                size: 14, 
                align: 'center', 
                color: MEETRA_GREEN 
            }, 

            // --- PAGE 5 ---
            // UPDATED: Replaced hardcoded "560" with data.panelWattage
            { val: data.panelWattage, page: 4, x: 296, y: 661, font: font },               
            { val: data.panelMake, page: 4, x: 391, y: 655, font: fontBold },  
            
            // UPDATED: Replaced hardcoded "17" with data.panelQty
            { val: data.panelQty, page: 4, x: 533, y: 653, font: font },                
            
            { val: data.panelType, page: 4, x: 119, y: 643, font: font },      
            
            // UPDATED: Mapped to data.inverterCapacity (was plantCapacity before)
            { val: data.inverterCapacity, page: 4, x: 192, y: 618, font: font },  
            { val: data.inverterMake, page: 4, x: 391, y: 618, font: fontBold }, 
            
            { val: "80x40", page: 4, x: 156, y: 422, font: font },             
            { val: "80x40", page: 4, x: 264, y: 422, font: font },             
            { val: "60x40", page: 4, x: 158, y: 405, font: font },             
            { val: data.structureMake, page: 4, x: 391, y: 440, font: font },  
            { val: data.structureQty, page: 4, x: 531, y: 440, font: font },   

            // --- PAGE 6 ---
            { val: data.laType, page: 5, x: 115, y: 450, font: font },         

            // --- PAGE 7 ---
            { val: autoQuotNo, page: 6, x: 309, y: 755, font: font },          
            { val: autoDate, page: 6, x: 490, y: 755, font: font },            
            { val: data.customerName, page: 6, x: 42, y: 755, font: fontBold }, 
            { val: data.plantCapacity, page: 6, x: 91, y: 635, font: font },   
            { val: data.plantCapacity, page: 6, x: 91, y: 552, font: font },   

            // Prices
            { val: formatCurrency(data.systemRate), page: 6, x: 342, y: 628, font: font },     
            { val: formatCurrency(data.systemCost), page: 6, x: 475, y: 626, font: font },     
            { val: formatCurrency(data.gstAmount), page: 6, x: 475, y: 585, font: font },      
            { val: formatCurrency(data.structureRate), page: 6, x: 342, y: 549, font: font },  
            { val: formatCurrency(data.structureCost), page: 6, x: 475, y: 553, font: font },  

            // TOTAL AMOUNT (Formatted + Rs.)
            { 
                val: `Rs. ${formatCurrency(data.totalAmount)}`, 
                page: 6, 
                x: 450, 
                y: 518, 
                size: 14, 
                color: WHITE, 
                font: fontBold,
                eraserColor: MEETRA_GREEN 
            }, 

            // --- PAGE 8 ---
            { val: data.inverterWarranty, page: 7, x: 68, y: 560, font: font }, 
        ];

        replacements.forEach(item => {
            const page = pages[item.page];
            // Ensure value is a string, handle empty values safely
            const textString = String(item.val || '');
            const textFont = item.font || font;
            const textSize = item.size || 11;
            const textColor = item.color || BLACK;

            let xPosition = item.x;

            if (item.align === 'center') {
                const textWidth = textFont.widthOfTextAtSize(textString, textSize);
                const { width } = page.getSize();
                xPosition = (width - textWidth) / 2; 
            }

            page.drawText(textString, {
                x: xPosition, 
                y: item.y, 
                size: textSize, 
                font: textFont,
                color: textColor, 
            });
        });

        const pdfBytes = await pdfDoc.save();
        res.set({ 'Content-Type': 'application/pdf' });
        res.send(Buffer.from(pdfBytes));

    } catch (error) { console.log(error); res.status(500).send("Error"); }
});

// IMPORTANT: Updated for Render deployment
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
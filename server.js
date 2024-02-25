const puppeteer = require('puppeteer');
const express = require('express');
const multer = require('multer');
const { createObjectCsvWriter } = require('csv-writer'); // Import createObjectCsvWriter
const cors=require("cors");
const fs = require('fs');
const csvParser = require('csv-parser');
const { time } = require('console');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(cors());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Index.html'));
});

app.get('/scraped_data.csv', (req, res) => {
  res.download('scraped_data.csv');
});
async function getLinkedInUrl(companyName, xdetail) {
    const browser = await puppeteer.launch({ headless: false }); // Set headless to true for a headless browser
    const page = await browser.newPage();

    try {
        // Navigate to Google
        await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded' });

        // Wait for the textarea to be present
        await page.waitForSelector('textarea');

        // Type into the textarea
        await page.type('textarea', `${companyName} ${xdetail}`);


        // Wait for navigation to complete after pressing "Enter"
        await Promise.all([
            page.waitForNavigation(), // The promise resolves after navigation has finished
            page.keyboard.press('Enter'), // Clicking the link will indirectly cause a navigation
        ]);

        // Extract the first LinkedIn URL
        const linkedinUrl = await page.evaluate(() => {
            const result = document.querySelector('.tF2Cxc a');
            return result ? result.href : null;
        });

        if (linkedinUrl) {
            console.log(`LinkedIn URL for ${companyName} CEO: ${linkedinUrl}`);
            data.push({ companyName, linkedinUrl })
        } else {
            console.log(`No LinkedIn URL found for ${companyName} CEO`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

let data = []; // Define data array

app.post('/scrape', upload.single('file'), async (req, res) => {
    console.log("Hello");
    const results = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => results.push(data.companyName))
            .on('end', () => resolve(results))
            .on('error', reject);
    });

    data = []; // Reset data array

    for (let i = 0; i < results.length; i++) {
        await getLinkedInUrl(results[i], 'CEO linkedin');
        console.log('done for ', results[i]);
    }

    const csvHeader = [
        { id: 'companyName', title: 'Company Name' },
        { id: 'linkedinUrl', title: 'LinkedIn URL' }
    ];

    // Create CSV writer
    const csvWriterInstance = createObjectCsvWriter({
        path: 'scraped_data.csv',
        header: csvHeader
    });

    try {
        // Write records to CSV file
        await csvWriterInstance.writeRecords(data);
        console.log('CSV file written successfully');

        // Set response headers for CSV file download
        res.setHeader('Content-Disposition', 'attachment; filename="scraped_data.csv"');
        res.setHeader('Content-Type', 'text/csv');

        // Send CSV file as response
        res.sendFile('scraped_data.csv', { root: __dirname });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }

    res.sendFile('scraped_data.csv', { root: __dirname });
});

app.listen(3000, () => {
    console.log('app is running on 3000');
});



import whois from 'whois';
import createCsvWriter from 'csv-writer';
import nodemailer from 'nodemailer';
import schedule from 'node-schedule';


async function newFetchDomains() {
    try {
        const response = await fetch('https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_BDek6gAEbRO8clEafL58PjNRWFwk1')
        const data = await response.json()

        return data
    } catch (err) {
        console.log(err)
    }
}


async function sendEmail(filteredDomains) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: SENDER_ADDRESS,
            pass: SENDER_PASSWORD
        }
    });

    const mailOptions = {
        from: SENDER_ADDRESS,
        to: RECEIVER_ADDRESS,
        subject: 'New Domains',
        text: filteredDomains.map(domain => `${domain.domain} - ${domain.registeredDate} - ${domain.email}`).join('\n')
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}


async function runJob() {
    const currentDate = new Date();
    const newRegisteredDomains = await newFetchDomains()


    const filteredDomains = [];

    for (const domain of newRegisteredDomains) {
        try {
            whois.lookup(domain.domain, async (err, whoisData) => {
                if (err) {
                    console.log(err)
                }

                const email = whoisData.emails ? whoisData.emails.join(', ') : 'N/A'

                if (new Date(whoisData.creationDate) >= currentDate) {
                    filteredDomains.push({
                        domain: domain.domain,
                        registeredDate: new Date(whoisData.creationDate),
                        email: email
                    })
                }

                if (filteredDomains.length === newRegisteredDomains.length) {
                    const csvWriter = createCsvWriter.createObjectCsvWriter({
                        path: 'domains.csv',
                        header: [
                            { id: 'domain', title: 'Domain' },
                            { id: 'registeredDate', title: 'Registered Date' },
                            { id: 'email', title: 'Email' }

                        ]
                    });

                    try {
                        await csvWriter.writeRecords(filteredDomains)
                        console.log('Filtered Data is written in csv')
                        sendEmail(filteredDomains)
                    } catch (err) {
                        console.log(err)
                    }
                }
            })
        } catch (error) {
            console.error(`Error fetching WHOIS data for ${domain.domain}:`, error);
        }
    }

}

runJob()

schedule.scheduleJob('0 10 * * *', () => {
    console.log('Running the script at 10:00 AM...');
    runJob();
});



const express = require('express')
const fs = require('fs').promises
const puppeteer = require('puppeteer')
const bodyParser = require('body-parser')
const app = express()

app.use(bodyParser.urlencoded({
  extended: true
}));

// app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile('/view/index.html', { root: __dirname });
});

app.post('/view', async (req,res) => {
  const playerName = req.body.playerName

  async function scrape(pName) {

    const modifiedName = pName.toLowerCase().replace(' ','-')
  
    let url = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(pName)}`
    const browser = await puppeteer.launch({
      headless: true,
    })
    const page = await browser.newPage()
  
    page.setDefaultNavigationTimeout(0);


    await page.goto(url,{
      waitUntil: "domcontentloaded",
      });
  
    //  Scraping player key from url
      const playerKey = await page.evaluate(() => {
        const link = document.querySelectorAll('.hauptlink a')
        const linkParts = link[0].href.split('/');
        const playerID = linkParts[linkParts.length - 1]
        return playerID
        
      }) 
      const newUrl = `https://www.transfermarkt.com/${modifiedName}/leistungsdaten/spieler/${playerKey}/plus/0?saison=ges`
      
      
      url = newUrl
      
      await page.goto(url,{
        waitUntil: "domcontentloaded",
      })

      // Scraping all needed stats
      
      const datas = await page.evaluate(() => {
        const allStats = document.querySelectorAll('tfoot .zentriert')
        const name = document.querySelector('.data-header__headline-wrapper').textContent
        const stats = Array.from(allStats)
        return {
          name: name,
          appearences: stats[0].textContent,
          goals: stats[1].textContent,
          assists: stats[2].textContent
          
        }
    })    
    const url2 = `https://www.transfermarkt.com/${modifiedName}/erfolge/spieler/${playerKey}`

    url = url2;

    await page.goto(url,{
      waitUntil: "domcontentloaded",
    })

    // Scraping trophies count

    const trophyCount = await page.evaluate(() => {
      const allTrophies = document.querySelectorAll('.content-box-headline')
      const arrTrophies = Array.from(allTrophies)
      return arrTrophies.map(el => {
        const match = el.textContent.trim().match(/(\d+)x/)
        return match ? parseInt(match[1]) : null
      }).reduce((acc,tr) => acc+Number(tr),0)
    })
     
    await browser.close()
    return {datas,trophyCount}

  }
  const stats = await scrape(playerName)

  if(req.url === '/view') {
    // const data = await fs.readFile('./view/index.html','utf8')
    res.send(`<ul>
    <h2>${playerName}-in statistikası</h2>
    <li>Oyun sayı: ${stats.datas.appearences}</li>
    <li>Qol sayı: ${stats.datas.goals}</li>
    <li>Assist sayı: ${stats.datas.assists}</li>
    <li>Kubok və mükafat sayı: ${stats.trophyCount}</li>
    </ul>`)
  }
  
})





app.listen(3000)
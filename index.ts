import puppeteer, { Browser, Page } from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

function delay(time: number): Promise<void> {
    return new Promise(resolve => { 
        setTimeout(resolve, time);
    });
}

async function connectWallet(page: Page): Promise<boolean> {
    let walletIsConnected = false;

    try {
        const connectWalletButton = "#swap-box > div > div > div.w100 > div > div";
        await page.$eval(connectWalletButton, elem => (elem as HTMLElement).click());
    } catch (error) {
        console.log('Wallet might already be connected or connection button not found');
        walletIsConnected = true;
    }

    if (!walletIsConnected) {
        try {
            const chooseOKX = "#container > div > div:nth-child(3) > div > div > div > div > div.col.gap-20 > div.grid-wallet-options > div:nth-child(3)";
            await page.$eval(chooseOKX, elem => (elem as HTMLElement).click());
        } catch (error) {
            console.error('Error connecting wallet:', error);
            throw new Error('Failed to connect wallet');
        }
    }

    return walletIsConnected;
}

async function performSwap(page: Page): Promise<void> {
    await delay(3000);
    const selectPairDestination = await page.waitForSelector('::-p-xpath(//*[@id="swap-box"]/div/div/div[1]/div[2]/div[3]/div[2]/div/div)');
    await selectPairDestination?.click();

    const inputPairName = await page.waitForSelector('::-p-xpath(//*[@id="toolbox"]/div/div[2]/div/div[1]/div/input)');
    await inputPairName?.type('WETH');

    const WETHSelector = "#tokenselector > div > div.fade-in-mid.token-selector-currencies.col > div";
    await page.$eval(WETHSelector, elem => (elem as HTMLElement).click());

    await delay(2000);

    const inputPercentageSelector = "#swap-input > div.col.gap-12 > div.row2.gap-10.align > button:nth-child(3)";
    await page.$eval(inputPercentageSelector, elem => (elem as HTMLElement).click());

    await delay(2000);

    const confirmSwapSelector = "#swap-box > div > div > div.w100 > button";
    await page.$eval(confirmSwapSelector, elem => (elem as HTMLElement).click());
}

async function confirmOkxTransaction(browser: Browser): Promise<void> {
    try {
        await delay(3000);

        const pages = await browser.pages();

        const OKX_EXTENSION_ID = 'mcohilncbfahbmgdjkbpemcciiolgcge';
        
        const okxPage = pages.find(page => {
            const url = page.url();
            const isOkxNotification = url.includes(OKX_EXTENSION_ID) && url.includes('notification.html');
            
            console.log('Checking page:', {
                url,
                isOkxNotification,
                title: page.title()
            });
            
            return isOkxNotification;
        });
        
        if (!okxPage) {
            console.error('OKX notification page not found!');
            throw new Error('OKX Wallet notification page not found');
        }

        await okxPage.bringToFront();

        await okxPage.waitForSelector('.okui-btn', { timeout: 5000 })
            .catch(() => console.log('No .okui-btn found initially'));

        await delay(2000);
        if (!okxPage) {
            throw new Error('OKX Wallet page not found');
        }

        await okxPage.bringToFront();

        await okxPage.setViewport({ width: 720, height: 720 });

        await delay(2000);

        const confirmationButton = "#app > div > div._affix_oe51y_42._borderTop_oe51y_48 > div > button.okui-btn.btn-lg.btn-fill-highlight._action-button_j3bvq_1";
        await okxPage.$eval(confirmationButton, elem => (elem as HTMLElement).click());

        console.log('OKX confirmation button clicked');

    } catch (error) {
        console.error('Error during OKX confirmation:', error);
        throw error;
    }
}


async function waitForOkxTransactionSuccess(page: Page): Promise<void> {
    try {
        await delay(60000);
        console.log("Transaction success element is visible.");

        const randomX = Math.floor(Math.random() * 100) + 1;
        const randomY = Math.floor(Math.random() * 100) + 1;
        await page.mouse.click(randomX, randomY);
        console.log("Clicked outside the dialog to close it.");
    } catch (error) {
        console.log("Transaction success element did not appear in time:", error);
    }
}

async function unwrapETH(page: Page): Promise<void> {
    try {
        const swabButton = "#swap-box > div > div > div.col.gap-10 > div.col.align > div.box-shadow-thin.swap-exchange-icon.br10.pointer";
        await page.$eval(swabButton, elem => (elem as HTMLElement).click());
    
        await delay(2000);
        const inputPercentageSelector = "#swap-input > div.col.gap-12 > div.row2.gap-10.align > button:nth-child(4)";
        await page.$eval(inputPercentageSelector, elem => (elem as HTMLElement).click());
    
        await delay(2000);
        const confrimButton = "#swap-box > div > div > div.w100 > button";
        await page.$eval(confrimButton, elem => (elem as HTMLElement).click());
    } catch (error) {
        console.error('Error unwrapping ETH:', error);
    }
}

async function runSwapCycle(browser: Browser, page: Page): Promise<void> {
    try {
        await connectWallet(page);
        await performSwap(page);
        await confirmOkxTransaction(browser);

        await waitForOkxTransactionSuccess(page);
        await unwrapETH(page);
        await confirmOkxTransaction(browser);

        await waitForOkxTransactionSuccess(page);
        
        console.log('Completed one swap cycle');
        await delay(5000);
    } catch (error) {
        console.error('Error during swap cycle:', error);
    }
}

async function main() {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        const wsChromeEndpointurl = process.env.wsChromeEndpointUrl;
        browser = await puppeteer.connect({
            browserWSEndpoint: wsChromeEndpointurl
        });

        while (true) {
            try {
                console.log('Starting new swap cycle...');
                
                page = await browser.newPage();
                await page.goto('https://ritsu.xyz/swap');
                
                await runSwapCycle(browser, page);
                
                await page.close();

            } catch (error) {
                console.error('Error in swap cycle:', error);
                if (page) {
                    await page.close();
                }
                await delay(10000);
            }
        }
    } catch (error) {
        console.error('Fatal error in main process:', error);

        if (browser) {
            await browser.disconnect();
        }
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
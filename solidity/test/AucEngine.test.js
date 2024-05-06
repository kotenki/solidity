const { expect } = require("chai")
const { ethers } = require("hardhat")
const { loadFixture } = require ("@nomicfoundation/hardhat-toolbox/network-helpers")

describe("AucEngine", function(){
    let owner;
    let seller;
    let buyer;
    let auct;

    async function deploy() {
        [owner, seller, buyer] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("AucEngine", owner)
        auct = await Factory.deploy()
        await auct.waitForDeployment()

        return { owner, seller, buyer, auct }
    }

    it("sets owner", async function(){
        const { auct, owner } = await loadFixture(deploy);
        expect(await auct.owner()).to.be.eq(owner.address);
        
    })

    describe("createAuction", function () {
        it("creates auction correctly", async function () {
            const { auct } = await loadFixture(deploy);
            const auctionName = "fake item";
            const tx = await auct.createAuction(
                ethers.parseEther("0.0001"),
                3,
                auctionName,
                60
            )

            const cAuction = await auct.auctions(0)
            console.log(cAuction);
            expect(cAuction.item).to.eq(auctionName)
            

        })

        it("sets end date correctly", async function () {
           const duration = 70 // seconds
           const { auct } = await loadFixture(deploy); 

           const tx = await auct.createAuction(
            ethers.parseEther("0.0001"),
            3,
            "test",
            duration
        )

        const timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
        //console.log("block timestamp of auction creation")
        //console.log(timestamp)
        expect((await auct.auctions(0)).endsAt).to.be.eq(timestamp + duration);

        })
    })

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    describe("buy", function () {
        it("allows to buy", async function () {
            const { seller, buyer, auct } = await loadFixture(deploy); 

            const createAuctionTx = await auct.connect(seller).createAuction(
                ethers.parseEther("0.0001"),
                3,
                "test",
                60
            )
            console.log("Auction created: ")
            console.log(await auct.auctions(0)) 

            this.timeout(5000) // 5s

            await delay(3000);
            console.log("Getting price for item: ")
            console.log(await auct.getPriceFor(0))
            
            console.log("Buying...")
            const buyTx = await auct.connect(buyer).
              buy(0, {value: ethers.parseEther("0.0002")})

            const cAuction = await auct.auctions(0)
            const finalPrice = cAuction.finalPrice;

            //console.log(cAuction) 

            await expect(() => buyTx).
              to.changeEtherBalance(
                seller, finalPrice - Math.floor((finalPrice * 10) / 100)
              )
            

        })
    })

})
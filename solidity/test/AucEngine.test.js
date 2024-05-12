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

    async function createAuction(_who, _price, _discount, _name, _duration) {
        const createAuctionTx = await auct.connect(_who).createAuction(
            ethers.parseEther(_price),
            _discount,
            _name,
            _duration
        )
        return createAuctionTx;
    }

    describe("createAuction", function () {
        it("creates auction correctly", async function () {
            const { auct, owner} = await loadFixture(deploy);
            const auctionName = "fake item";
            const tx = await createAuction(owner, "0.0001", 3, auctionName, 60);

            const cAuction = await auct.auctions(0)
            //console.log(cAuction);
            expect(cAuction.item).to.eq(auctionName)
            

        })

        it("sets end date correctly", async function () {
           const duration = 70 // seconds
           const { auct, owner } = await loadFixture(deploy); 

           const tx = await createAuction(owner, "0.0001", 3, "test", duration);


            const timestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;
            expect((await auct.auctions(0)).endsAt).to.be.eq(timestamp + duration);

        })

        it("checks validity of starting price", async function() {
            const { auct, owner } = await loadFixture(deploy); 

            await expect(
                createAuction(owner, "0.0000001", 10000000000, "test", 60))
                .to.be.revertedWith('incorrect starting price');
                    
        })
    })

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    describe("buy", function () {
        it("allows to buy", async function () {
            const { seller, buyer, auct } = await loadFixture(deploy); 

            const createAuctionTx = await createAuction(seller, "0.0001", 3, "test", 60);

            this.timeout(5000) // 5s
            await delay(1000);

            const buyTx = await auct.connect(buyer).
              buy(0, {value: ethers.parseEther("0.0002")})

            const cAuction = await auct.auctions(0)
            const finalPrice = cAuction.finalPrice;
            //console.log("finalPrice = ",finalPrice)

            await expect(() => buyTx).
              to.changeEtherBalance(
                seller, BigInt(finalPrice) - ((finalPrice * BigInt(10)) / BigInt(100))
              )

            await expect(buyTx)
              .to.emit(auct, 'AuctionEnded')
              .withArgs(0, finalPrice, buyer.address)

            await expect(
                auct.connect(buyer).
                    buy(0, {value: ethers.parseEther("0.0002")})
            ).to.be.revertedWith('stopped!');
        })

        it("doesn't allow to fetch current price when the auction is finished", async function() {
            const { auct, owner } = await loadFixture(deploy); 
            const createAuctionTx = await createAuction(owner, "0.0001", 3, "test", 2);
            const buyTx = await auct.connect(buyer).
                buy(0, {value: ethers.parseEther("0.0002")});

            await expect(
                auct.getPriceFor(0)
            ).to.be.revertedWith("stopped!");
            

        })

        it("doesn't allow to buy when the auction is ended", async function () {
            const { auct, seller, buyer } = await loadFixture(deploy); 
            const createAuctionTx = await createAuction(seller, "0.0001", 3, "test", 2);
            
            this.timeout(5000)
            await delay(3000);

            await expect(
                auct.connect(buyer).buy(0, {value: ethers.parseEther("0.0002")})
            ).to.be.revertedWith("ended!");

        })

        it("doesn't allow to buy when not enough funds sent", async function () {
            const { auct, seller, buyer } = await loadFixture(deploy); 
            const createAuctionTx = await createAuction(seller, "0.0001", 3, "test", 60);
            await expect(
                auct.connect(buyer).buy(0, {value: ethers.parseEther("0.000005")})
            ).to.be.revertedWith("not enough funds");
        })
    })

    describe("withdraw", function () {
        it("allows to withdraw", async function () {
            const { auct, seller, buyer, owner } = await loadFixture(deploy); 
            const createAuctionTx = await createAuction(seller, "0.0001", 3, "test", 60);

            const buyTx = await auct.connect(buyer).
              buy(0, {value: ethers.parseEther("0.0002")});

            const cAuction = await auct.auctions(0)
            const finalPrice = cAuction.finalPrice;

            await expect(auct.withdraw(owner.address)).
                to.changeEtherBalance(
                    owner, ((BigInt(finalPrice) * BigInt(10)) / BigInt(100)))
        })
        it("doesn't allow to withdraw to not an owner", async function () {
            const { auct, seller, buyer, owner } = await loadFixture(deploy); 
            const createAuctionTx = await createAuction(seller, "0.0001", 3, "test", 60);

            const buyTx = await auct.connect(buyer).
              buy(0, {value: ethers.parseEther("0.0002")});

            //onst cAuction = await auct.auctions(0)
            //const finalPrice = cAuction.finalPrice;
            
            await expect(auct.connect(seller).withdraw(seller.address)).
                to.be.revertedWith("you are not the owner!");
        })
    })

})
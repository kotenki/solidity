const { expect } = require("chai")
const { ethers } = require("hardhat")
const { loadFixture } = require ("@nomicfoundation/hardhat-toolbox/network-helpers")

describe("Demo", function(){

    let demo 

    async function deploy() {
        const [owner, other_addr] = await ethers.getSigners()
        const Factory = await ethers.getContractFactory("Demo")
        demo = await Factory.deploy()
        await demo.waitForDeployment()

        return { owner, other_addr, demo }
    }
    async function sendMoney(sender) {
        const amount = 100 
        const txData = {
            to: demo.target,    // demo.target is TO address (contract)
            value: amount
        }

        const tx = await sender.sendTransaction(txData);
        await tx.wait();

        return [tx, amount]
    }

    it("should allow to send money", async function(){
        const { owner, other_addr, demo } = await loadFixture(deploy)
        const [sendMoneyTx, amount] = await sendMoney(other_addr) // other_addr is FROM address
        //console.log(sendMoneyTx)
        await expect(() => sendMoneyTx)
            .to.changeEtherBalance(demo, amount);

        const timestamp = (
            await ethers.provider.getBlock(sendMoneyTx.blockNumber)
        ).timestamp

        await expect(sendMoneyTx)
            .to.emit(demo, "Paid")
            .withArgs(other_addr.address, amount, timestamp)

    })

    it("should allow to withdraw to the owner", async function (){
        const { owner, other_addr, demo } = await loadFixture(deploy)
        const [_, amount] = await sendMoney(other_addr)
    
        const withdrawTx = await demo.withdraw(owner.address)
        
        await expect(() => withdrawTx)
        .to.changeEtherBalances([demo, owner], [-amount, amount]);
    })

    it("should not allow to withdraw to others", async function(){
        const { other_addr, demo } = await loadFixture(deploy)

        await expect(
            demo.connect(other_addr).withdraw(other_addr)
        ).to.be.revertedWith("you are not an owner!")
    })





})
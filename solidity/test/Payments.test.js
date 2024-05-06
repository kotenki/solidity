//const { loadFixture, ethers, expect } = require("./setup")
const { loadFixture } = require ("@nomicfoundation/hardhat-toolbox/network-helpers")
const { ethers } = require("hardhat")
const { expect } = require("chai")

describe("Payments", function(){
    async function deploy() {

        const [user1, user2] = await ethers.getSigners()
        const Factory = await ethers.getContractFactory("Payments")
        const payments = await Factory.deploy()
        await payments.waitForDeployment()

        return { user1, user2, payments }
    }

    it("should be deployed", async function() {
        const { payments } = await loadFixture(deploy)
        expect(payments.target).to.be.properAddress 

        //console.log(await payments.getAddress())
        //console.log(user1.address)
        //console.log(user2.address)
    })

    it("should have 0 eth by default", async function(){
        const { payments } = await loadFixture(deploy)
        const balance = await payments.currentBalance()
        expect(balance).to.eq(0)
    })

    it("should be possible to send funds", async function(){
        const { user1, user2, payments } = await loadFixture(deploy)

        const sum = 100 //wei 
        const msg = "hello from hardhat"

        //console.log(await ethers.provider.getBalance(user2.address))
        const tx = await payments.connect(user2).pay(msg, { value: sum })
        //console.log(await ethers.provider.getBalance(user2.address))
        const receipt = await tx.wait(1)

        const currentBlock = await ethers.provider.getBlock(
            await ethers.provider.getBlockNumber()
        )
        

        await expect(tx).to.changeEtherBalance(user2, -sum)

        const newPayment = await payments.getPayment(user2.address, 0)
        expect(newPayment.message).to.eq(msg)
        expect(newPayment.amount).to.eq(sum)
        expect(newPayment.timestamp).to.eq(currentBlock.timestamp)


    })

})
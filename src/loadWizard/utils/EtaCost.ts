// ETA and cost vary as a function of EC2 region/zone and bucket region/zone, for now we fake it
// We assume that both are located in the same zone, not just region.
// All costs in dollars, time in secs
class EtaCost {
    private costPerGB: number;
    private pcplCost1K: number;
    private gsCost1K: number;
    private oneGig: number;
    private numIOs: number;
    private numPcpl: number;
    private numGs: number;
    private bandwidthGBps: number;
    private sampleSize: number;
    private numCores: number;

    constructor({ numCores = 32 } = {}) {
        this.costPerGB = 0.01
        this.pcplCost1K = 0.0055  // PUT/COPY/POST/LIST (Deletes are free)
        this.gsCost1K = 0.00044  // GET/SELECT
        this.oneGig = Math.pow(2, 30) // a billion
        this.numIOs = 3 // number of round-trips (including temp file)
        this.numPcpl = 1
        this.numGs = 2
        this.bandwidthGBps = 10/8 // assuming AWS 10 gig network
        this.sampleSize = 1000
        this.numCores = numCores;
    }

    // input {files : [{file : "/foo/bar/foo.csv", sizeInBytes : 423422}, {file : "/foo/bar/foo1.csv", sizeInBytes : 54333}]}
    discover_etacost(myfiles) {
        var singleFileCost = (this.sampleSize*this.costPerGB*this.numIOs)/this.oneGig + (this.pcplCost1K*this.numPcpl)/1000 + (this.gsCost1K*this.numGs)/1000
        var singleFileEta = this.sampleSize/(this.bandwidthGBps*this.oneGig*this.numCores)
        var totalCost = singleFileCost * myfiles.length
        var totalEta = singleFileEta * myfiles.length
        // var totalSize = 0
        // var newfiles = JSON.parse(JSON.stringify(myfiles))
        // for (var file of newfiles.files) {
        //     file.costInDollars = (sampleSize*this.costPerGB*this.numIOs)/this.oneGig + (this.pcplCost1K*this.numPcpl)/1000 + (this.gsCost1K*this.numGs)/1000
        //     file.etaInSecs = sampleSize/(this.bandwidthGBps*this.oneGig*numCores)
        //     totalSize += file.sizeInBytes
        //     totalCost += file.costInDollars
        //     totalEta += file.etaInSecs
        // }
        // newfiles.totalCost = totalCost
        // newfiles.totalEta = totalEta
        // newfiles.totalSize = totalSize
        // return newfiles
        return {
            singleFileCost: singleFileCost,
            singleFileEta: singleFileEta,
            totalCost: totalCost,
            totalEta: totalEta,
        }
    }

    // input {files : [{file : "/foo/bar/foo.csv", sizeInBytes : 423422}, {file : "/foo/bar/foo1.csv", sizeInBytes : 54333}]}
    load_etacost(file) {
        // var totalCost = 0
        // var totalEta = 0
        // for (var file of myfiles) {
            // file.costInDollars = (file.sizeInBytes*this.costPerGB)/this.oneGig + (this.pcplCost1K*this.numPcpl)/1000 + (this.gsCost1K*this.numGs)/1000
            // file.etaInSecs = file.sizeInBytes/(this.bandwidthGBps*this.oneGig*thisnumCores)
            var fileCostInDollars = (file.sizeInBytes*this.costPerGB)/this.oneGig + (this.pcplCost1K*this.numPcpl)/1000 + (this.gsCost1K*this.numGs)/1000
            var fileEtaInSecs = file.sizeInBytes/(this.bandwidthGBps*this.oneGig*this.numCores)

        //     totalCost += fileCostInDollars
        //     totalEta += fileEtaInSecs
        // }
        // newfiles.totalCost = totalCost
        // newfiles.totalEta = totalEta
        // newfiles.totalSize = totalSize
        // return newfiles

        return {
            fileCost: fileCostInDollars,
            fileEta: fileEtaInSecs,
        }
    }

    loadEtaBySize(sizeInBytes) {
        return sizeInBytes / (this.bandwidthGBps * this.oneGig);
    }
}
module.exports = EtaCost

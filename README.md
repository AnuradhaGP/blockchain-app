### How to set up

## Step 1
set up Hyperledger fabric environment and download binaries

# Prerequisits
- Docker and Docker-compose
- Node.js
- jq
- Golang
- curl



Download fabric-sample repo 
```
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
```

Then install the fabric-samples and binaries
```
./install-fabric.sh docker samples binary
```
for additional info:
https://hyperledger-fabric.readthedocs.io/en/release-2.5/prereqs.html

## Step 2
Set up test-network
```
cd fabric-sample/test-network
```
To up the test-network
```
./network.sh up
```
To down the test-network
```
./network.sh down
```

create channel
```
./network.sh createChannel -c mychannel -ca -s couchdb
```
## Step 3
Deploy the Chaincode

```
./network.sh deployCC -ccn basic -ccp ../../blockchain-app/chaincode -ccl javascript -c mychannel

```
## Step 4
Go to sdk/application path and run the AdminRegister.js

```
node AdminRegister.js
```

## Step 5

run the app.js to start the server.
```
node app.js
```
P.S make sure to change channelName to the channel name using
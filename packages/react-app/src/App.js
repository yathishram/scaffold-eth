import React, { useState, useEffect } from 'react'
import 'antd/dist/antd.css';
import { ethers } from "ethers";
import "./App.css";
import { Row, Col, Input, Button, Spin, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { Transactor } from "./helpers"
import { useExchangePrice, useGasPrice, useContractLoader, useContractReader } from "./hooks"
import { Header, Account, Provider, Faucet, Ramp, Address, Contract } from "./components"
const { TextArea } = Input;
const { BufferList } = require('bl')

//importing and intialising IPFS and IPFS provider
const ipfsAPI = require('ipfs-http-client');
const ipfs = ipfsAPI({host: 'ipfs.infura.io', port: '5001', protocol: 'https' })


/**
 * function to get the text content from IPFS
 * @param hashToGet 
 */
const getFromIPFS = async hashToGet => {
  for await (const file of ipfs.get(hashToGet)) {
    console.log(file.path)
    if (!file.content) continue;
    const content = new BufferList()
    for await (const chunk of file.content) {
      content.append(chunk)
    }
    console.log(content)
    return content
  }
}


/**
 * function to add a file to IPFS
 * @param fileToUpload - Buffered file 
 */
const addToIPFS = async fileToUpload => {
  for await (const result of ipfs.add(fileToUpload)) {
    return result
  }
}

/**
 * Initialising providers
 *  1. mainnetProvider - using ethers to intialise main net providers.
 *  2. localProvider - the local chain or testnets.
 * */ 
const mainnetProvider = new ethers.providers.InfuraProvider("mainnet","2717afb6bf164045b5d5468031b93f87")
const localProvider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_PROVIDER?process.env.REACT_APP_PROVIDER:"http://localhost:8545")

function App() {

  /**
   * Setting of States
   */
  const [address, setAddress] = useState(); // "address" to set the user Address
  const [count, setCount] = useState(0)
  const [injectedProvider, setInjectedProvider] = useState(); // "injectedProvider" to get the injected provider
  const price = useExchangePrice(mainnetProvider); // "price" is fetched from useExchangePrice hook with mainnetProvider 
  const gasPrice = useGasPrice("fast"); //"gasPrice" to set the gas price


  const tx = Transactor(injectedProvider,gasPrice); //Transactor Object to set tx variable for communicating with contract

  const readContracts = useContractLoader(localProvider); // To load and read the contract from local
  const writeContracts = useContractLoader(injectedProvider); // To write contract

  const myAttestation = useContractReader(readContracts,"Attestor","attestations",[address, count],1777);
  
  const [ data, setData ] = useState() // "data" used to set the file data
  const [fileName, setFileName] = useState()
  const [fileData, setFileData] = useState([])
  const [ sending, setSending ] = useState() 
  const [ ipfsHash, setIpfsHash ] = useState() //used to set ipfsHash
  const [ ipfsContents, setIpfsContents ] = useState() //used to display ipfs content data
  const [ attestationContents, setAttestationContents ] = useState() 


  /**
   * used to get text content from the ipfs and set the result
   */
  const asyncGetFile = async ()=>{
    let result = await getFromIPFS(ipfsHash)
    setIpfsContents(result.toString())
  }



  /**
   * function to convert the file to buffer
   * @param reader 
   */
  const convertToBuffer = async (reader) => {
    const buffer = await Buffer.from(reader.result);
    setData(buffer)
  };

  /**
   * useEffect to fetch the latest ipfs hash
   */

  useEffect(()=>{
    if(ipfsHash) asyncGetFile()
  },[asyncGetFile, ipfsHash])


  let ipfsDisplay = ""
  if(ipfsHash){
    if(!ipfsContents){
      ipfsDisplay = (
        <Spin />
      )
    }else{
      ipfsDisplay = (
        <pre style={{margin:8,padding:8,border:"1px solid #dddddd",backgroundColor:"#ededed"}}>
          {ipfsContents}
        </pre>
      )
    }
  }


  // const asyncGetAttestation = async ()=>{
  //   let result = await getFromIPFS(myAttestation)
  //   setAttestationContents(result.toString())
  // }

  const getAllData = async () => {
    const res = await tx(readContracts["Attestor"].getFiles(address))
    setFileData(res)
  }


  // useEffect(()=>{
  //   if(myAttestation) getAllData()
  // },[myAttestation])

  

  let attestationDisplay = ""
  if(myAttestation){
    if(!fileData){
      attestationDisplay = (
        <Spin />
      )
    }else{
      attestationDisplay = (
        <div>
          <Address value={address} /> attests to:
          <pre style={{margin:8,padding:8,border:"1px solid #dddddd",backgroundColor:"#ededed"}}>
            <ul>
            {fileData.map(data => {
              return(
                <li key={data.ipfsHash}>
                  <span>
                    File Name: {data.fileName} <br />
                     <a id="gateway-link" target='_blank'
                      href={'https://ipfs.io/ipfs/' + data.ipfsHash}>
                      Click here to get File
                     </a>
                  </span>
                </li>
              )
            })}
            </ul>
          
          </pre>
        </div>

      )
    }
  }

  return (
    <div className="App">
      <Header />
      <div style={{position:'fixed',textAlign:'right',right:0,top:0,padding:10}}>
        {/* Step 1: Use the Account component to set the user account and display the same */}
        <Account
          address={address}
          setAddress={setAddress}
          localProvider={localProvider}
          injectedProvider={injectedProvider}
          setInjectedProvider={setInjectedProvider}
          mainnetProvider={mainnetProvider}
          price={price}
        />
      </div>

      {/* Step 2: File Input. The onChange event takes the file and converts it into buffer */}
      <div style={{padding:32,textAlign: "left"}}>
        Let's Upload a File!
        <br />    
        <input type="file" style={{margin:10, width:"200px"}} rows={10} onChange={(event)=>{
          const file = event.target.files[0];
          console.log(file);
          setFileName(file.name);
          let reader = new window.FileReader();
          reader.readAsArrayBuffer(file);
          reader.onloadend = () => convertToBuffer(reader)
        }} />

        {/* onClick function first sets the sending value to true, resets the ipfsHash and IpfsContents and adds
        the file to the IPFS and sets the result.*/}

        <Button style={{margin:8}} loading={sending} size="large" shape="round" type="primary" onClick={async()=>{
          console.log("UPLOADING...")
          setSending(true)
          setIpfsHash()
          setIpfsContents()
          const result = await addToIPFS(data)
          if(result && result.path) {
            setIpfsHash(result.path)
          }
          setSending(false)
          console.log("RESULT:",result)
        }}>Upload to IPFS</Button>
      </div>

      {/* Step 3: Set the input value of the input field to ipfsHash.
        onClick of the button write the transaction to the 
      */}
      <div style={{padding:32,textAlign: "left"}}>
        IPFS Hash: <Input value={ipfsHash} onChange={(e)=>{
          setIpfsHash(e.target.value)
        }} />
        <Button disabled={!ipfsHash} style={{margin:8}} size="large" shape="round" type="primary" onClick={async()=>{
          tx( writeContracts["Attestor"].attest(fileName, ipfsHash) )
        }}>Attest to this hash on Ethereum</Button>
      </div>

      <div style={{padding:32,textAlign: "left"}}>
        Get Your File here:  <Button disabled={!ipfsHash} style={{margin:8}} size="large" shape="round" type="primary"><a id="gateway-link" target='_blank'
              href={'https://ipfs.io/ipfs/' + ipfsHash}>
              Get recent file
            </a></Button>
            <br />
            <Button style={{margin:8}} size="large" shape="round" type="primary" onClick={() => {getAllData()}}>Get All Data</Button>
            <div style={{padding:32,textAlign: "left"}}>
                {attestationDisplay}
            </div>
      </div>

      <div style={{position:'fixed',textAlign:'left',left:0,bottom:20,padding:10}}>
        <Row align="middle" gutter={4}>
          <Col span={9}>
            <Ramp
              price={price}
              address={address}
            />
          </Col>
          <Col span={15}>
            <Faucet
              localProvider={localProvider}
              price={price}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default App;
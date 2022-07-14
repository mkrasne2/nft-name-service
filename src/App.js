import React, { useEffect, useState } from "react";
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import {ethers} from "ethers";
import abi from "./components/abi.json";
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';
import InlineSVG from 'svg-inline-react';



// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const tld = '.kween';



const App = () => {
	const [currentAccount, setCurrentAccount] = useState('');
	const [domain, setDomain] = useState('');
  const [record, setRecord] = useState('');
	const [network, setNetwork] = useState('');
	const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
	const [mints, setMints] = useState([]);
	const [transaction, setTransactionProcess] = useState('');
	

	
	
  
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask -> https://metamask.io/");
        return;
      }

      // Fancy method to request access to account.
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    
      // Boom! This should print out public address once we authorize Metamask.
      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error)
    }
  }
	
	const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log('Make sure you have metamask!');
      return;
    } else {
      console.log('We have the ethereum object', ethereum);
    }

    // Check if we're authorized to access the user's wallet
    const accounts = await ethereum.request({ method: 'eth_accounts' });

    // Users can have multiple authorized accounts, we grab the first one if its there!
    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log('Found an authorized account:', account);
      setCurrentAccount(account);
    } else {
      console.log('No authorized account found');
    }

		const chainId = await ethereum.request({ method: 'eth_chainId' });
    setNetwork(networks[chainId]);

    ethereum.on('chainChanged', handleChainChanged);
    
    // Reload the page when they change networks
    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  };

	const switchNetwork = async () => {
		if (window.ethereum) {
			try {
				// Try to switch to the Mumbai testnet
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
				});
			} catch (error) {
				// This error code means that the chain we want has not been added to MetaMask
				// In this case we ask the user to add it to their MetaMask
				if (error.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{	
									chainId: '8001',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
											name: "Mumbai Matic",
											symbol: "MATIC",
											decimals: 18
									},
									blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
								},
							],
						});
					} catch (error) {
						console.log(error);
					}
				}
				console.log(error);
			}
		} else {
			// If window.ethereum is not found then MetaMask is not installed
			alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		} 
	}

	const mintDomain = async () => {
		// Don't run if the domain is empty
		if (!domain) { return }
		// Alert the user if the domain is too short
		if (domain.length < 3) {
			alert('Domain must be at least 3 characters long');
			return;
		}
		// Calculate price based on length of domain (change this to match your contract)	
		// 3 chars = 0.5 MATIC, 4 chars = 0.3 MATIC, 5 or more = 0.1 MATIC
		const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		console.log("Minting domain", domain, "with price", price);
		try {
				const { ethereum } = window;
				if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract('0x0c4741E78029A399d025D17d808ae7d3bF812028', abi, signer);
				
				console.log("Going to pop wallet now to pay gas...")
				setTransactionProcess(true);
						let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)});
						// Wait for the transaction to be mined
				const receipt = await tx.wait();
	
				// Check if the transaction was successfully completed
				if (receipt.status === 1) {
					console.log("Domain minted! https://mumbai.polygonscan.com/tx/"+tx.hash);
					
					// Set the record for the domain
					tx = await contract.setRecord(domain, record);
					setTransactionProcess(false);
					await tx.wait();
	
					console.log("Record set! https://mumbai.polygonscan.com/tx/"+tx.hash);
					
					// Call fetchMints after 2 seconds
					setTimeout(() => {
						fetchMints();
					}, 2000);
	
					setRecord('');
					setDomain('');
				} else {
					setTransactionProcess(false);
					alert("Transaction failed! Please try again");
				}
				}
			} catch(error) {
				console.log(error);
			}
	}

	const fetchMints = async () => {
		try {
			const { ethereum } = window;
			if (ethereum) {
				// You know all this
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract('0x0c4741E78029A399d025D17d808ae7d3bF812028', abi, signer);
				var base64 = require('base-64');
				//var svgtojsx = require('svg-to-jsx');
				// Get all the domain names from our contract
				const names = await contract.getAllNames();
					
				// For each name, get the record and the address
				const mintRecords = await Promise.all(names.map(async (name) => {
				const mintRecord = await contract.records(name);
				const owner = await contract.domains(name);
				const idt = names.indexOf(name);

				const printContract = await contract.tokenURI(idt);
				async function check(url){
					const dest = 
					await fetch(url)
					.then(response => response.text())
					.then(data => JSON.parse(data))
					.then(response => response.image)
					.then(response => response.toString())
					.then(response => response.split(','))
					.then(response => response[1]);
					return dest;
				}
				let item = await check(printContract);
				
				
				const decodedData = await base64.decode(item);

				
					
				
				return {
					id: idt,
					name: name,
					record: mintRecord,
					owner: owner,
					location: decodedData
				};
			}));
	
			console.log("MINTS FETCHED ", mintRecords);
			setMints(mintRecords);
			}
		} catch(error){
			console.log(error);
		}
	}
	
	// This will run any time currentAccount or network are changed
	useEffect(() => {
		if (network === 'Polygon Mumbai Testnet') {
			fetchMints();
		}
	}, [currentAccount, network]);

	const updateDomain = async () => {
		if (!record || !domain) { return }
  setLoading(true);
  console.log("Updating domain", domain, "with record", record);
    try {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract('0x0c4741E78029A399d025D17d808ae7d3bF812028', abi, signer);

      let tx = await contract.setRecord(domain, record);
      await tx.wait();
      console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);

      fetchMints();
      setRecord('');
      setDomain('');
    }
    } catch(error) {
      console.log(error);
    }
  setLoading(false);
	}
  // Create a function to render if wallet is not connected yet
  const renderNotConnectedContainer = () => (
    <div className="connect-wallet-container">
      <img src="https://media.giphy.com/media/z1O0LvhBRLpEo2zFdR/giphy.gif" alt="kween gif" />
      <button onClick={connectWallet} className="cta-button connect-wallet-button">
        Connect Wallet
      </button>
    </div>
    );

		const renderMintLoading = () => 
			(
					<div className="connect-wallet-container">
						<img src="https://media.giphy.com/media/44xXqOpSV01c4/giphy.gif" alt="loading queen" />
						<p className="subtitle"> Minting in progress...</p>
						<p className="subtitle"> U BETTA WAIT</p>
					</div>
					);
			
		

					const renderMints = () => {
						if (currentAccount && mints.length > 0) {
							return (
								<div className="mint-container">
									<p className="subtitle"> Recently minted legendary domains:</p>
									<div className="mint-list">
										{ mints.map((mint, index) => {
											return (
												<div className="mint-item" key={index}>
														<div className='mint-row'>
														<InlineSVG className = 'nft-image'src={mint.location} />
											</div>
													<div className='mint-row'>
														<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${'0x0c4741E78029A399d025D17d808ae7d3bF812028'}/${mint.id}`} target="_blank" rel="noopener noreferrer">
															<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
														</a>
														{/* If mint.owner is currentAccount, add an "edit" button*/}
														{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
															<button className="edit-button" onClick={() => editRecord(mint.name)}>
																<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
															</button>
															:
															null
														}
													</div>
										<p className = 'nft-name'> {mint.record} </p>
									</div>)
									})}
								</div>
							</div>);
						}
					};
					
					// This will take us into edit mode and show us the edit buttons!
					const editRecord = (name) => {
						console.log("Editing record for", name);
						setEditing(true);
						setDomain(name);
					}

		const renderInputForm = () =>{
			if (network !== 'Polygon Mumbai Testnet') {
				return (
					<div className="connect-wallet-container">
						<h2>Please switch to Polygon Mumbai Testnet</h2>
        <button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
					</div>
				);
			}
			return (
				<div className="form-container">
					<div className="first-row">
						<input
							type="text"
							value={domain}
							placeholder='your royal name'
							onChange={e => setDomain(e.target.value)}
						/>
						<p className='tld'> {tld} </p>
					</div>
	
					<input
						type="text"
						value={record}
						placeholder='your inspo diva'
						onChange={e => setRecord(e.target.value)}
					/>

					
	
					{editing ? (
            <div className="button-container">
              
              <button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
                Set record
              </button>  
              
              <button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
                Cancel
              </button>  
            </div>
          ) : (
            // If editing is not true, the mint button will be returned instead
            <button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
              Mint
            </button>  
          )}
      </div>
    );
  }
  // This runs our function when the page loads.
  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <header>
            <div className="left">
            <p className="title">👑 Kween Name Service</p>
            <p className="subtitle">Sometimes you just have to throw on a crown and remind them who they're dealing with </p>
            </div>
						<div className="right">
      				<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
      				{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
    				</div>
          </header>
        </div>

       
				{!currentAccount && renderNotConnectedContainer()}
				{transaction && renderMintLoading()}
				{!transaction && currentAccount && renderInputForm()}
				{mints && renderMints()}	

        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a className="footer-text" 
            href={TWITTER_LINK} 
            target="_blank"
            rel="noreferrer">
              {` `}
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

contract Attestor {
    struct File {
        string fileName;
        string ipfsHash;
    }

    event Attest(address sender, string hash);

    mapping(address => File[]) public attestations;

    function attest(string memory _fileName, string memory _hash) public {
        emit Attest(msg.sender, _hash);
        File memory newFile = File({fileName: _fileName, ipfsHash: _hash});
        attestations[msg.sender].push(newFile);
    }

    function getFiles(address _userAddress)
        public
        view
        returns (File[] memory)
    {
        return attestations[_userAddress];
    }
}

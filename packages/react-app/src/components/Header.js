import React from 'react'
import { PageHeader } from 'antd';

export default function Header(props) {
  return (
    <div>
      <PageHeader
        title="Scaffold - IPFS"
        subTitle="a 🏗 Scaffold-ETH example app for IPFS File Uploading"
        style={{cursor:'pointer'}}
      />
    </div>
  );
}

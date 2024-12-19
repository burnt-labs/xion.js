export default function NftList({ nfts }) {
  if (!nfts || nfts.length === 0) {
    return <p>No NFTs found.</p>;
  }

  return (
    <>
      <h2>NFT Token IDs:</h2>
      <ul>
        {nfts.map((tokenId) => (
          <li key={tokenId}>{tokenId}</li>
        ))}
      </ul>
    </>
  );
}

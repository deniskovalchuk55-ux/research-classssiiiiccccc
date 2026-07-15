export default function App({ Component, pageProps }) {
  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}

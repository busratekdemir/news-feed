const markets = [
  ["S&P 500", "5,473.17", "up", "+0.42%"],
  ["NASDAQ", "17,721.59", "up", "+0.71%"],
  ["Dow Jones", "39,134.76", "down", "-0.18%"],
  ["Gold", "$2,334", "up", "+0.35%"],
  ["Brent", "$85.23", "down", "-0.47%"],
  ["Bitcoin", "$63,842", "up", "+1.02%"],
  ["Ethereum", "$3,512", "up", "+0.89%"],
  ["Tesla", "$326.11", "up", "+2.14%"],
  ["NVIDIA", "$1,441.20", "up", "+1.88%"],
];

function MarketTicker() {
  return (
    <section className="market-ticker">
      <div className="live-dot">● LIVE MARKETS</div>

      <div className="ticker-track">
        {[...markets, ...markets].map((item, index) => (
          <div key={index} className="market-item">
            <strong>{item[0]}</strong>
            <span>{item[1]}</span>
            <em className={item[2]}>
              {item[2] === "up" ? "▲" : "▼"} {item[3]}
            </em>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MarketTicker;
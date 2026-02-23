import React, { useState } from 'react';

const App = (): React.ReactElement => {
  const [count, setCount] = useState<number>(0);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer"></a>
      </div>

      <h1>Vite + React</h1>

      <div className="card">
        <button onClick={() => setCount((prev) => prev + 1)}>count is {count}</button>

        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </>
  );
};

export default App;

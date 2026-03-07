import { VoxelScene } from './scene/VoxelScene';
import { UIOverlay } from './components/UIOverlay';
import { WebcamView } from './components/WebcamView';
import './index.css';

function App() {
  return (
    <div className="app-container">
      <VoxelScene />
      <WebcamView />
      <UIOverlay />
    </div>
  );
}

export default App;

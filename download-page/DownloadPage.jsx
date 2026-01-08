/**
 * DownloadPage React Component
 * Shows user's OS options and downloads from GitHub releases
 */

const { useState, useEffect } = React;

function DownloadPage() {
  const [releaseInfo, setReleaseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userOS, setUserOS] = useState(null);

  useEffect(() => {
    detectUserOS();
    fetchRelease();
  }, []);

  const detectUserOS = () => {
    const platform = window.navigator.platform.toLowerCase();
    const userAgent = window.navigator.userAgent.toLowerCase();

    if (platform.includes('mac') || userAgent.includes('mac')) {
      setUserOS({ name: 'Mac', icon: 'Mac' });
    } else if (platform.includes('win') || userAgent.includes('win')) {
      setUserOS({ name: 'Windows', icon: 'Windows' });
    } else if (platform.includes('linux') || userAgent.includes('linux')) {
      setUserOS({ name: 'Linux', icon: 'Linux' });
    } else {
      setUserOS(null);
    }
  };

  const fetchRelease = async () => {
    try {
      setLoading(true);
      const info = await window.githubApi.fetchLatestRelease();
      setReleaseInfo(info);
    } catch (err) {
      setError('Failed to fetch release information. Please try again later.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMacDownloads = () => {
    if (!releaseInfo) return [];
    return releaseInfo.assets
      .filter(asset => asset.platform === 'mac')
      .map(asset => ({
        ...asset,
        label: asset.architecture === 'arm64' ? 'Mac (Apple Silicon - M1/M2/M3)' :
                asset.architecture === 'x64' ? 'Mac (Intel)' :
                asset.name.includes('dmg') ? 'Mac (DMG)' :
                'Mac (ZIP)'
      }));
  };

  const getWindowsDownloads = () => {
    if (!releaseInfo) return [];
    return releaseInfo.assets
      .filter(asset => asset.platform === 'windows')
      .map(asset => ({
        ...asset,
        label: 'Windows (NSIS Installer)'
      }));
  };

  const getLinuxDownloads = () => {
    if (!releaseInfo) return [];
    return releaseInfo.assets
      .filter(asset => asset.platform === 'linux')
      .map(asset => ({
        ...asset,
        label: asset.name.includes('AppImage') ? 'Linux (AppImage)' :
                asset.name.includes('.deb') ? 'Linux (Debian/Ubuntu)' :
                asset.name
      }));
  };

  const handleDownload = (asset) => {
    window.open(asset.browserDownloadUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="download-page">
        <div className="container">
          <div className="hero">
            <h1 className="app-name">Typid</h1>
            <p className="tagline">A Minimal, Beautiful Markdown Editor</p>
            <div className="loading">Loading download options...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="download-page">
        <div className="container">
          <div className="hero">
            <h1 className="app-name">Typid</h1>
            <p className="tagline">A Minimal, Beautiful Markdown Editor</p>
            <div className="error">{error}</div>
            <button onClick={fetchRelease} className="retry-button">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const macDownloads = getMacDownloads();
  const windowsDownloads = getWindowsDownloads();
  const linuxDownloads = getLinuxDownloads();

  return (
    <div className="download-page">
      <div className="container">
        <div className="hero">
          <h1 className="app-name">Typid</h1>
          <p className="tagline">A Minimal, Beautiful Markdown Editor</p>
          <div className="version-badge">
            Version {releaseInfo.version}
            <span className="version-date">
              ({window.githubApi.formatDate(releaseInfo.releaseDate)})
            </span>
          </div>

          {userOS && (
            <div className="recommended-badge">
              Recommended: <strong>{userOS.name}</strong>
            </div>
          )}
        </div>

        <div className="download-sections">
          {macDownloads.length > 0 && (
            <DownloadSection
              title="Mac"
              icon="M"
              downloads={macDownloads}
              isRecommended={userOS?.name === 'Mac'}
              onDownload={handleDownload}
            />
          )}

          {macDownloads.length > 0 && (
            <div className="installation-note">
              <h4>macOS Installation Note</h4>
              <p>Follow these exact steps:</p>
              <ol>
                <li>Extract the downloaded ZIP file (Typid.app will appear in Downloads)</li>
                <li>Drag Typid.app from Downloads to your Applications folder</li>
                <li>Open Terminal and run: <code>cd /Applications && xattr -cr Typid.app && open Typid.app</code></li>
              </ol>
              <p>The app will now open! macOS will remember your approval going forward.</p>
            </div>
          )}

          {windowsDownloads.length > 0 && (
            <DownloadSection
              title="Windows"
              icon="W"
              downloads={windowsDownloads}
              isRecommended={userOS?.name === 'Windows'}
              onDownload={handleDownload}
            />
          )}

          {linuxDownloads.length > 0 && (
            <DownloadSection
              title="Linux"
              icon="L"
              downloads={linuxDownloads}
              isRecommended={userOS?.name === 'Linux'}
              onDownload={handleDownload}
            />
          )}
        </div>

        <div className="footer">
          <a href={releaseInfo.htmlUrl} target="_blank" rel="noopener noreferrer" className="github-link">
            View all releases on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}

function DownloadSection({ title, icon, downloads, isRecommended, onDownload }) {
  return (
    <div className={`download-section ${isRecommended ? 'recommended' : ''}`}>
      <div className="section-header">
        <div className="icon">{icon}</div>
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="download-buttons">
        {downloads.map(download => (
          <div key={download.name} className="download-button">
            <button
              onClick={() => onDownload(download)}
              className="button primary"
            >
              <span className="button-icon">↓</span>
              <span className="button-text">{download.label}</span>
            </button>
            <div className="download-info">
              <span className="file-size">
                {window.githubApi.formatFileSize(download.size)}
              </span>
              <span className="file-name">{download.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.githubApi = window.githubApi || {};

window.githubApi.fetchLatestRelease = async function() {
  try {
    const owner = 'gellasangameshgupta';
    const repo = 'typid';
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      version: data.tag_name.replace(/^v/, ''),
      releaseDate: data.published_at,
      releaseNotes: data.body,
      assets: data.assets.map(asset => ({
        name: asset.name,
        size: asset.size,
        downloadUrl: asset.url,
        browserDownloadUrl: asset.browser_download_url,
        platform: detectPlatform(asset.name),
        architecture: detectArchitecture(asset.name)
      })),
      htmlUrl: data.html_url
    };
  } catch (error) {
    console.error('Failed to fetch release:', error);
    return null;
  }
};

function detectPlatform(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('mac') || lower.includes('darwin')) return 'mac';
  if (lower.includes('win') || lower.includes('nsis')) return 'windows';
  if (lower.includes('linux') || lower.includes('appimage') || lower.includes('.deb')) return 'linux';
  return 'unknown';
}

function detectArchitecture(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('arm64') || lower.includes('aarch64')) return 'arm64';
  if (lower.includes('x64') || lower.includes('x86_64') || lower.includes('amd64')) return 'x64';
  if (lower.includes('universal')) return 'universal';
  return 'unknown';
}

window.githubApi.formatFileSize = function(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

window.githubApi.formatDate = function(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DownloadPage />
  </React.StrictMode>
);

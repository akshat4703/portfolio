import { buildBody } from './rig.js';
import { PROP_JOBS } from './props.js';
import { GUY_JOBS } from './guy.js';

onmessage = (e) => {
  const data = buildBody(e.data, { ...PROP_JOBS, ...GUY_JOBS });
  const transfer = [];
  for (const p of [...Object.values(data.parts), ...Object.values(data.props)]) for (const k of ['position', 'normal', 'index', 'uv', 'uv1', 'region', 'under', 'blend']) if (p[k]) transfer.push(p[k].buffer);
  postMessage(data, transfer);
};

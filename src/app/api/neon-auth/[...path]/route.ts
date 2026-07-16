import { getNeonAuth } from '@Hashibutogarasu/db';

const { GET, POST } = getNeonAuth().handler();
export { GET, POST };

import { defineField, FieldType } from 'twenty-sdk/define';
import { OBJECT } from '../constants/universal-identifiers';

export default defineField({
  universalIdentifier: 'b36c000e-c02f-555f-a426-1a50bb10bc86',
  objectUniversalIdentifier: OBJECT.ACCOUNT,
  name: 'proxyProtocolType',
  label: 'Proxy Protocol',
  type: FieldType.SELECT,
  icon: 'IconTag',
  isNullable: true,
  isUIEditable: false,
  options: [
    {
      id: '3e794b04-179d-521a-ae97-d6a628e93981',
      value: 'HTTP',
      label: 'HTTP',
      position: 0,
      color: 'gray',
    },
    {
      id: 'c76ad5fa-a808-55cf-a795-2aec1728708d',
      value: 'HTTPS',
      label: 'HTTPS',
      position: 1,
      color: 'gray',
    },
    {
      id: '0968a43e-b5a0-5bf3-8598-fd8bece5e1fa',
      value: 'SOCKS4',
      label: 'SOCKS4',
      position: 2,
      color: 'gray',
    },
    {
      id: 'a2d80aaf-5a42-5cf8-a485-6ad77037ba5d',
      value: 'SOCKS5',
      label: 'SOCKS5',
      position: 3,
      color: 'gray',
    },
    {
      id: '00f25484-833c-5860-80f3-1f3dbbace7ad',
      value: 'OTHER',
      label: 'Other',
      position: 4,
      color: 'gray',
    },
  ],
});

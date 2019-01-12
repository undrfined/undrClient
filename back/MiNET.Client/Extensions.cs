using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace MiNET.Client
{
	public static class Extensions
	{
		public static string ReadNbsString(this BinaryReader binaryReader)
		{
			var len = binaryReader.ReadInt32();
			var str = "";
			for (var i = 0; i < len; i++)
				str += (char) binaryReader.ReadByte();
			return str;
		}
	}
}
